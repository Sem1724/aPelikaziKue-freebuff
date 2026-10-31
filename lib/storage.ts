import { DEF_PENGATURAN, DATA_AWAL, buatId, klonRekap } from "./defaults";
import type { DB, EntriHari, HariMap, KueHari, KueMaster, Penitip, Settings } from "./types";

export const KUNCI_DB = "catatanTitipanKue";
/** Salinan data terakhir yang sudah sinkron dengan Firebase (dasar untuk menggabungkan perubahan). */
export const KUNCI_DASAR = "dasarFirebase";
/** Salinan data lokal yang tertimpa saat pertama kali tersambung (jaga-jaga). */
export const KUNCI_SEBELUM = "salinanSebelumFirebase";
export const SKEMA = 2;

const objek = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);

const teks = (v: unknown, cadangan: string): string =>
  typeof v === "string" ? v : typeof v === "number" ? String(v) : cadangan;

const bilangan = (v: unknown, cadangan: number): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : cadangan;
};

const uangAtauKosong = (v: unknown): number | "" => {
  if (v === "" || v === null || v === undefined) return "";
  const n = Number(v);
  return Number.isFinite(n) ? n : "";
};

export function buatDataAwal(): DB {
  const penitip: Penitip[] = DATA_AWAL.map(([nama, daftar]) => ({
    id: buatId(),
    nama,
    kue: daftar.map(([namaKue, setor]) => ({ id: buatId(), nama: namaKue, setor, jual: 0 })),
  }));
  return {
    versi: SKEMA,
    penitip,
    hari: {},
    pengaturan: { ...DEF_PENGATURAN, gaya: {} },
    pengaturanRekap: klonRekap({ ...DEF_PENGATURAN, gaya: {} }),
    periode: {},
  };
}

/** Gabungkan pengaturan tersimpan dengan nilai bawaan (aman untuk cadangan versi lama). */
export function rapikanPengaturan(mentah: unknown, dasar: Settings): Settings {
  const hasil: Settings = { ...dasar };
  if (!objek(mentah)) return hasil;
  (Object.keys(DEF_PENGATURAN) as (keyof Settings)[]).forEach((k) => {
    if (k === "gaya") return;
    const nilai = mentah[k];
    const bawaan = DEF_PENGATURAN[k];
    if (typeof bawaan === "number") {
      (hasil as unknown as Record<string, unknown>)[k] = bilangan(nilai, bawaan);
    } else if (typeof bawaan === "string") {
      (hasil as unknown as Record<string, unknown>)[k] = teks(nilai, bawaan);
    }
  });
  // nilai enum dijaga agar tidak merusak PDF
  if (!["helvetica", "times", "courier"].includes(hasil.pdfFamily)) hasil.pdfFamily = "helvetica";
  if (!["grid", "plain"].includes(hasil.pdfTema)) hasil.pdfTema = "grid";
  if (objek(mentah.gaya)) hasil.gaya = mentah.gaya as Settings["gaya"];
  return hasil;
}

function rapikanKueMaster(mentah: unknown): KueMaster | null {
  if (!objek(mentah)) return null;
  const nama = teks(mentah.nama, "").trim();
  if (!nama) return null;
  return {
    id: teks(mentah.id, "") || buatId(),
    nama,
    setor: bilangan(mentah.setor, 0),
    jual: bilangan(mentah.jual, 0),
  };
}

function rapikanPenitip(mentah: unknown): Penitip | null {
  if (!objek(mentah)) return null;
  const nama = teks(mentah.nama, "").trim();
  if (!nama) return null;
  const kue = Array.isArray(mentah.kue)
    ? (mentah.kue.map(rapikanKueMaster).filter(Boolean) as KueMaster[])
    : [];
  return {
    id: teks(mentah.id, "") || buatId(),
    nama,
    rekap: mentah.rekap === true,
    kue,
  };
}

function rapikanEntri(mentah: unknown): EntriHari {
  const hasil: EntriHari = { hadir: false, fisik: "", kue: {} };
  if (!objek(mentah)) return hasil;
  hasil.hadir = mentah.hadir === true;
  hasil.fisik = uangAtauKosong(mentah.fisik);
  if (objek(mentah.kue)) {
    Object.entries(mentah.kue).forEach(([id, nilai]) => {
      if (!objek(nilai)) return;
      const kue: KueHari = {
        nama: teks(nilai.nama, ""),
        nitip: uangAtauKosong(nilai.nitip),
        sisa: uangAtauKosong(nilai.sisa),
        setor: bilangan(nilai.setor, 0),
        jual: bilangan(nilai.jual, 0),
      };
      hasil.kue[id] = kue;
    });
  }
  return hasil;
}

function rapikanHari(mentah: unknown): HariMap {
  const hasil: HariMap = {};
  if (!objek(mentah)) return hasil;
  Object.entries(mentah).forEach(([tgl, isi]) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(tgl) || !objek(isi)) return;
    const hari: Record<string, EntriHari> = {};
    Object.entries(isi).forEach(([pid, entri]) => {
      hari[pid] = rapikanEntri(entri);
    });
    hasil[tgl] = hari;
  });
  return hasil;
}

function rapikanPeriode(mentah: unknown): DB["periode"] {
  const hasil: DB["periode"] = {};
  if (!objek(mentah)) return hasil;
  Object.entries(mentah).forEach(([pid, daftar]) => {
    if (!Array.isArray(daftar)) return;
    hasil[pid] = daftar
      .filter((x): x is { sampai: string } => objek(x) && typeof x.sampai === "string")
      .map((x) => ({ sampai: x.sampai }))
      .sort((a, b) => a.sampai.localeCompare(b.sampai));
  });
  return hasil;
}

/**
 * Terima data dari localStorage, cadangan lama, atau Firebase, lalu jadikan DB yang sah.
 * Melempar error hanya jika data sama sekali tidak bisa dipakai.
 */
export function normalisasiDB(mentah: unknown, opsi: { longgar?: boolean } = {}): DB {
  if (!objek(mentah) || !Array.isArray(mentah.penitip)) {
    if (opsi.longgar) throw new Error("Bukan data aplikasi ini.");
    return buatDataAwal();
  }
  const penitip = mentah.penitip.map(rapikanPenitip).filter(Boolean) as Penitip[];
  const pengaturan = rapikanPengaturan(mentah.pengaturan, DEF_PENGATURAN);
  const pengaturanRekap = objek(mentah.pengaturanRekap)
    ? rapikanPengaturan(mentah.pengaturanRekap, DEF_PENGATURAN)
    : klonRekap(pengaturan);
  return {
    versi: SKEMA,
    penitip,
    hari: rapikanHari(mentah.hari),
    pengaturan,
    pengaturanRekap,
    periode: rapikanPeriode(mentah.periode),
  };
}

export type HasilMuat = { db: DB; galat: string | null };

export function muatDB(): HasilMuat {
  if (typeof window === "undefined") return { db: buatDataAwal(), galat: null };
  try {
    const mentah = window.localStorage.getItem(KUNCI_DB);
    if (!mentah) return { db: buatDataAwal(), galat: null };
    return { db: normalisasiDB(JSON.parse(mentah)), galat: null };
  } catch (e) {
    return {
      db: buatDataAwal(),
      galat:
        "Data tersimpan tidak bisa dibaca (" +
        (e instanceof Error ? e.message : "tidak diketahui") +
        "). Aplikasi dimulai dengan data awal — jangan mengetik dulu, coba Pulihkan cadangan.",
    };
  }
}

export type HasilSimpan = { ok: boolean; galat: string | null };

/** Simpan ke perangkat. Kesalahan kuota/privasi dilaporkan, tidak ditelan diam-diam. */
export function simpanDB(db: DB): HasilSimpan {
  if (typeof window === "undefined") return { ok: false, galat: null };
  try {
    window.localStorage.setItem(KUNCI_DB, JSON.stringify(db));
    return { ok: true, galat: null };
  } catch (e) {
    const penuh = e instanceof DOMException && (e.name === "QuotaExceededError" || e.code === 22);
    return {
      ok: false,
      galat: penuh
        ? "Penyimpanan perangkat penuh. Unduh cadangan sekarang, lalu hapus tanggal lama di tab Cadangan."
        : "Penyimpanan perangkat diblokir. Data hanya bertahan selama halaman ini terbuka — unduh cadangan.",
    };
  }
}

export function ukuranData(db: DB): number {
  try {
    return new Blob([JSON.stringify(db)]).size;
  } catch {
    return JSON.stringify(db).length;
  }
}

export function ukuranTeks(byte: number): string {
  if (byte < 1024) return byte + " B";
  if (byte < 1024 * 1024) return (byte / 1024).toFixed(0) + " KB";
  return (byte / 1024 / 1024).toFixed(1) + " MB";
}
