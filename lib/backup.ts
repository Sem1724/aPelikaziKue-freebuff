import { normalisasiDB, rapikanPengaturan } from "./storage";
import { DEF_PENGATURAN, klonRekap } from "./defaults";
import type { DB, JenisCadangan, Penitip } from "./types";

export const APLIKASI = "catatan-titipan-kue";

export const CADANGAN_META: Record<JenisCadangan, { nama: string; keterangan: string }> = {
  harian: {
    nama: "Catatan Harian",
    keterangan: "Nitip, sisa, dan uang fisik semua tanggal.",
  },
  pengaturan: {
    nama: "Pengaturan Laporan",
    keterangan: "Tulisan, warna, rata, dan ketebalan laporan harian serta rekap.",
  },
  master: {
    nama: "Data Master",
    keterangan: "Daftar penitip, kue, harga setor, dan harga jual.",
  },
  semua: {
    nama: "Semuanya",
    keterangan: "Catatan harian, pengaturan laporan, dan Data Master sekaligus.",
  },
};

export type FileCadangan = {
  jenis: JenisCadangan;
  aplikasi: string;
  dibuat: string;
  data: unknown;
  periode?: DB["periode"];
  pengaturanRekap?: DB["pengaturanRekap"];
};

export function buatIsiCadangan(db: DB, jenis: JenisCadangan): string {
  const isi: FileCadangan = {
    jenis,
    aplikasi: APLIKASI,
    dibuat: new Date().toISOString(),
    data:
      jenis === "harian"
        ? db.hari
        : jenis === "pengaturan"
          ? db.pengaturan
          : jenis === "master"
            ? db.penitip
            : db,
  };
  if (jenis === "harian") isi.periode = db.periode;
  if (jenis === "pengaturan") isi.pengaturanRekap = db.pengaturanRekap;
  return JSON.stringify(isi);
}

export type HasilPulih = { ok: boolean; db?: DB; pesan: string };

const objek = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);

/**
 * Pulihkan satu bagian dari teks file cadangan.
 * Menerima format baru ({ jenis, data }) maupun cadangan versi lama (seluruh db).
 */
export function pulihkanCadangan(db: DB, jenis: JenisCadangan, teksMentah: string): HasilPulih {
  let isi: unknown;
  try {
    isi = JSON.parse(teksMentah);
  } catch {
    return { ok: false, pesan: "File tidak bisa dibaca. Pastikan file .json dari aplikasi ini." };
  }

  let jenisFile = jenis;
  let data: unknown = isi;

  if (objek(isi) && typeof isi.jenis === "string" && "data" in isi) {
    jenisFile = isi.jenis as JenisCadangan;
    data = isi.data;
  } else if (objek(isi) && Array.isArray(isi.penitip) && objek(isi.hari)) {
    // cadangan lama: seluruh isi db tanpa pembungkus
    jenisFile = "semua";
  }

  if (jenisFile !== jenis) {
    const nama = CADANGAN_META[jenisFile]?.nama ?? "tidak dikenal";
    return {
      ok: false,
      pesan: `File ini cadangan "${nama}", bukan "${CADANGAN_META[jenis].nama}". Gunakan tombol Pulihkan pada bagian yang sesuai.`,
    };
  }

  try {
    if (jenis === "harian") {
      if (!objek(data)) return { ok: false, pesan: "Isi file tidak sesuai untuk Catatan Harian." };
      const baru = normalisasiDB({ ...db, hari: data, periode: objek(isi) ? (isi.periode ?? db.periode) : db.periode });
      return { ok: true, db: baru, pesan: "Catatan Harian berhasil dipulihkan." };
    }
    if (jenis === "pengaturan") {
      if (!objek(data)) return { ok: false, pesan: "Isi file tidak sesuai untuk Pengaturan Laporan." };
      const rekapMentah = objek(isi) && objek(isi.pengaturanRekap) ? isi.pengaturanRekap : db.pengaturanRekap;
      return {
        ok: true,
        db: {
          ...db,
          pengaturan: rapikanPengaturan(data, DEF_PENGATURAN),
          pengaturanRekap: rapikanPengaturan(rekapMentah, klonRekap(DEF_PENGATURAN)),
        },
        pesan: "Pengaturan Laporan berhasil dipulihkan.",
      };
    }
    if (jenis === "master") {
      if (!Array.isArray(data) || !data.length) {
        return { ok: false, pesan: "Isi file tidak berisi daftar penitip yang sah." };
      }
      const baru = normalisasiDB({ ...db, penitip: data });
      return { ok: true, db: baru, pesan: `Data Master berhasil dipulihkan (${baru.penitip.length} penitip).` };
    }
    if (!objek(data) || !Array.isArray(data.penitip) || !objek(data.hari)) {
      return { ok: false, pesan: "Isi file tidak lengkap untuk memulihkan semuanya." };
    }
    const baru = normalisasiDB(data, { longgar: true });
    return { ok: true, db: baru, pesan: "Semua data berhasil dipulihkan." };
  } catch (e) {
    return { ok: false, pesan: "Gagal memulihkan: " + (e instanceof Error ? e.message : "isi file rusak") };
  }
}

export function unduhTeks(namaFile: string, isi: string, tipe = "application/json"): void {
  const blob = new Blob([isi], { type: tipe + ";charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = namaFile;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Daftar penitip untuk dropdown rekap. */
export function penitipRekap(db: DB): Penitip[] {
  return db.penitip.filter((p) => p.rekap);
}
