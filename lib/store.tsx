"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { DB, Gaya, Penitip, Profil, Settings } from "./types";
import { buatId, penitipBaru } from "./defaults";
import { buatKonteks, type Konteks } from "./calc";
import { hariIni, jamSekarang } from "./format";
import { muatDB, normalisasiDB, simpanDB, ukuranData } from "./storage";
import { muatConfigSheet, panggilSheet, simpanConfigSheet, type SheetConfig } from "./sheet";
import { pulihkanCadangan, type HasilPulih } from "./backup";

type StatusSheet = { teks: string; galat: boolean };

type Aksi = {
  setHadir: (tgl: string, pid: string, hadir: boolean) => void;
  setNilaiKue: (tgl: string, pid: string, kid: string, field: "nitip" | "sisa", nilai: number | "") => void;
  setFisik: (tgl: string, pid: string, nilai: number | "") => void;

  ubahPenitip: (pid: string, ubah: Partial<Pick<Penitip, "nama" | "rekap">>) => void;
  tambahPenitip: () => void;
  hapusPenitip: (pid: string) => void;
  tambahKue: (pid: string) => void;
  ubahKue: (pid: string, kid: string, ubah: Partial<{ nama: string; setor: number; jual: number }>) => void;
  hapusKue: (pid: string, kid: string) => void;

  setPengaturan: (profil: Profil, kunci: keyof Settings, nilai: string | number) => void;
  setGaya: (profil: Profil, kunci: string, prop: keyof Gaya, nilai: string | number | boolean) => void;
  resetPengaturan: (profil: Profil) => void;

  tutupPeriode: (pid: string, sampai: string) => void;
  batalTutupPeriode: (pid: string) => void;

  pulihkan: (jenis: "harian" | "pengaturan" | "master" | "semua", teks: string) => HasilPulih;
  batalkanPulih: () => boolean;
  bisaBatalPulih: boolean;

  hapusTanggal: (tgl: string) => void;
  hapusSemuaHari: () => void;

  gantiTanggal: (tgl: string) => void;
};

type NilaiStore = {
  db: DB;
  konteks: Konteks;
  tanggal: string;
  ukuran: number;
  galatSimpan: string | null;
  sheet: StatusSheet & { config: SheetConfig | null; aktif: boolean };
  hubungkanSheet: (cfg: SheetConfig) => void;
  putuskanSheet: () => void;
  aksi: Aksi;
};

const StoreContext = createContext<NilaiStore | null>(null);

export function useStore(): NilaiStore {
  const v = useContext(StoreContext);
  if (!v) throw new Error("useStore dipakai di luar StoreProvider");
  return v;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const mulaiSekali = useRef(false);
  const [db, setDb] = useState<DB | null>(null);
  const [siap, setSiap] = useState(false);
  const [tanggal, setTanggal] = useState(() => hariIni());
  const [galatSimpan, setGalatSimpan] = useState<string | null>(null);
  const [ukuran, setUkuran] = useState(0);
  const [sheetStatus, setSheetStatus] = useState<StatusSheet>({ teks: "", galat: false });
  const [config, setConfig] = useState<SheetConfig | null>(null);
  const [salinanSebelum, setSalinanSebelum] = useState<string | null>(null);

  const dbRef = useRef<DB | null>(null);
  const terakhirRef = useRef<string>("");
  const remoteRef = useRef(false);

  // Sinkronisasi Sheet
  const cfgRef = useRef<SheetConfig | null>(null);
  const versiRef = useRef<number | null>(null);
  const dasarRef = useRef<string | null>(null);
  const kotorRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sedangRef = useRef(false);
  const tundaRef = useRef(false);
  const ketikRef = useRef(0);
  const tanpaVersiRef = useRef(false);

  const setStatus = useCallback((teks: string, galat = false) => {
    setSheetStatus({ teks, galat });
  }, []);

  const pasangDb = useCallback((baru: DB, dariRemote = true) => {
    dbRef.current = baru;
    terakhirRef.current = JSON.stringify(baru);
    // dariRemote = true: jangan kirim balik ke Sheet (data baru saja datang dari sana).
    remoteRef.current = dariRemote;
    setDb(baru);
  }, []);

  const terapkanDariSheet = useCallback(
    (data: unknown, versi: number | undefined) => {
      const baru = normalisasiDB(data, { longgar: true });
      versiRef.current = versi ?? null;
      dasarRef.current = JSON.stringify(baru);
      kotorRef.current = false;
      pasangDb(baru);
      simpanDB(baru);
    },
    [pasangDb],
  );

  const gabung = useCallback((basis: DB, lokal: DB, server: DB): DB => {
    const hasil: DB = JSON.parse(JSON.stringify(server));
    const sama = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
    (["penitip", "pengaturan", "pengaturanRekap", "periode"] as const).forEach((k) => {
      if (!sama(lokal[k], basis[k])) {
        (hasil as unknown as Record<string, unknown>)[k] = lokal[k];
      }
    });
    const tanggal = new Set([...Object.keys(basis.hari || {}), ...Object.keys(lokal.hari || {})]);
    tanggal.forEach((t) => {
      const pid = new Set([
        ...Object.keys(basis.hari?.[t] || {}),
        ...Object.keys(lokal.hari?.[t] || {}),
      ]);
      pid.forEach((p) => {
        const awal = basis.hari?.[t]?.[p];
        const kini = lokal.hari?.[t]?.[p];
        if (sama(awal, kini)) return;
        hasil.hari = hasil.hari || {};
        hasil.hari[t] = hasil.hari[t] || {};
        if (kini === undefined) delete hasil.hari[t][p];
        else hasil.hari[t][p] = kini;
        if (!Object.keys(hasil.hari[t]).length) delete hasil.hari[t];
      });
    });
    return hasil;
  }, []);

  const jadwalDorong = useCallback(() => {
    kotorRef.current = true;
    if (!cfgRef.current || versiRef.current === null) return;
    tundaRef.current = true;
    if (timerRef.current) clearTimeout(timerRef.current);
    setStatus("Menyimpan ke Sheet…");
    timerRef.current = setTimeout(() => void dorongRef.current?.(0), 1500);
  }, [setStatus]);

  const dorong = useCallback(
    async (percobaan: number) => {
      const cfg = cfgRef.current;
      if (!cfg) return;
      if (sedangRef.current) {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => void dorongRef.current?.(0), 1000);
        return;
      }
      tundaRef.current = false;
      sedangRef.current = true;
      const kirim = JSON.stringify(dbRef.current);
      try {
        const r = await panggilSheet(cfg, "tulis", { versi: versiRef.current, data: dbRef.current });
        if (r.ok) {
          versiRef.current = r.versi ?? versiRef.current;
          dasarRef.current = kirim;
          const masihKotor = JSON.stringify(dbRef.current) !== kirim;
          kotorRef.current = masihKotor;
          if (masihKotor) jadwalDorong();
          else setStatus("Tersimpan " + jamSekarang());
        } else if (r.konflik) {
          let server: DB;
          try {
            server = normalisasiDB(r.data, { longgar: true });
          } catch {
            setStatus("Sheet: data dari perangkat lain tidak bisa dibaca.", true);
            sedangRef.current = false;
            return;
          }
          const dasar = dasarRef.current ? (JSON.parse(dasarRef.current) as DB) : null;
          const hasil = dasar ? gabung(dasar, dbRef.current as DB, server) : server;
          versiRef.current = r.versi ?? versiRef.current;
          dasarRef.current = JSON.stringify(server);
          kotorRef.current = true;
          pasangDb(hasil);
          simpanDB(hasil);
          setStatus("Digabung dengan perubahan dari perangkat lain " + jamSekarang());
          sedangRef.current = false;
          if (percobaan < 3) {
            await dorongRef.current?.(percobaan + 1);
            return;
          }
        } else {
          setStatus("Sheet: " + (r.pesan ?? "permintaan ditolak"), true);
        }
      } catch (e) {
        const pesan = e instanceof Error && e.name === "AbortError" ? "waktu habis" : "gagal";
        setStatus(`Sheet: ${pesan} menyimpan, dicoba lagi. Data tetap aman di perangkat ini.`, true);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => void dorongRef.current?.(0), 10000);
      }
      sedangRef.current = false;
    },
    [gabung, jadwalDorong, pasangDb, setStatus],
  );

  const dorongRef = useRef(dorong);
  dorongRef.current = dorong;

  const tarik = useCallback(async () => {
    const cfg = cfgRef.current;
    if (!cfg) return;
    if (kotorRef.current) {
      await dorongRef.current?.(0);
      return;
    }
    setStatus("Sheet: membaca…");
    try {
      const r = await panggilSheet(cfg, "baca");
      if (!r.ok) {
        setStatus("Sheet: " + (r.pesan ?? "gagal membaca"), true);
        return;
      }
      if (r.data) {
        terapkanDariSheet(r.data, r.versi);
        setStatus("Sheet: terhubung, data dimuat " + jamSekarang());
      } else {
        versiRef.current = r.versi ?? null;
        dasarRef.current = null;
        kotorRef.current = true;
        await dorongRef.current?.(0);
      }
    } catch {
      setStatus("Sheet: gagal terhubung. Data tetap tersimpan di perangkat ini.", true);
    }
  }, [setStatus, terapkanDariSheet]);

  const cekBaru = useCallback(async () => {
    const cfg = cfgRef.current;
    if (!cfg || document.hidden || sedangRef.current || kotorRef.current || tundaRef.current) return;
    if (Date.now() - ketikRef.current < 5000) return;
    try {
      let versi: number | undefined;
      let data: unknown;
      if (!tanpaVersiRef.current) {
        const r = await panggilSheet(cfg, "versi");
        if (r.ok && typeof r.versi === "number") versi = r.versi;
        else if (r.pesan === "Aksi tidak dikenal") tanpaVersiRef.current = true;
      }
      if (versi === undefined) {
        const r = await panggilSheet(cfg, "baca");
        if (!r.ok) return;
        versi = r.versi;
        data = r.data;
      }
      if (versi === versiRef.current || kotorRef.current || sedangRef.current || tundaRef.current) return;
      if (!data) {
        const r = await panggilSheet(cfg, "baca");
        if (!r.ok) return;
        versi = r.versi;
        data = r.data;
      }
      if (data) {
        terapkanDariSheet(data, versi);
        setStatus("Sheet: diperbarui dari perangkat lain " + jamSekarang());
      }
    } catch {
      /* diamkan, dicoba lagi nanti */
    }
  }, [setStatus, terapkanDariSheet]);

  const segarkan = useCallback(() => {
    if (!cfgRef.current) return;
    if (versiRef.current === null) void tarik();
    else void cekBaru();
  }, [cekBaru, tarik]);

  const hubungkanSheet = useCallback(
    (cfg: SheetConfig) => {
      cfgRef.current = cfg;
      simpanConfigSheet(cfg);
      setConfig(cfg);
      versiRef.current = null;
      dasarRef.current = null;
      kotorRef.current = false;
      void tarik();
    },
    [tarik],
  );

  const putuskanSheet = useCallback(() => {
    cfgRef.current = null;
    versiRef.current = null;
    simpanConfigSheet(null);
    setConfig(null);
    setStatus("");
  }, [setStatus]);

  /* ===== muat data awal ===== */
  useEffect(() => {
    const hasil = muatDB();
    dbRef.current = hasil.db;
    terakhirRef.current = JSON.stringify(hasil.db);
    setDb(hasil.db);
    setUkuran(ukuranData(hasil.db));
    if (hasil.galat) setGalatSimpan(hasil.galat);
    setSiap(true);
  }, []);

  /* ===== simpan lokal + tandai perubahan untuk Sheet ===== */
  useEffect(() => {
    if (!siap || !db) return;
    const dariRemote = remoteRef.current;
    remoteRef.current = false;
    dbRef.current = db;
    const json = JSON.stringify(db);
    if (json === terakhirRef.current) return;
    terakhirRef.current = json;
    const hasil = simpanDB(db);
    setGalatSimpan(hasil.galat);
    setUkuran(ukuranData(db));
    if (!dariRemote) jadwalDorong();
  }, [db, siap, jadwalDorong]);

  /* ===== sambungkan ulang Sheet saat halaman dibuka ===== */
  useEffect(() => {
    if (!siap) return;
    if (mulaiSekali.current) return;
    mulaiSekali.current = true;
    const cfg = muatConfigSheet();
    if (!cfg) return;
    cfgRef.current = cfg;
    setConfig(cfg);
    void tarik();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siap]);

  /* ===== pemicu pemeriksaan berkala ===== */
  useEffect(() => {
    if (!siap) return;
    const catatKetik = () => {
      ketikRef.current = Date.now();
    };
    const saatTampil = () => {
      if (!document.hidden) segarkan();
    };
    document.addEventListener("input", catatKetik);
    document.addEventListener("visibilitychange", saatTampil);
    window.addEventListener("focus", segarkan);
    window.addEventListener("online", segarkan);
    const interval = setInterval(segarkan, 20000);
    return () => {
      document.removeEventListener("input", catatKetik);
      document.removeEventListener("visibilitychange", saatTampil);
      window.removeEventListener("focus", segarkan);
      window.removeEventListener("online", segarkan);
      clearInterval(interval);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [siap, segarkan]);

  /* ===== aksi data ===== */
  const update = useCallback((fn: (draft: DB) => DB) => {
    setDb((prev) => (prev ? fn(prev) : prev));
  }, []);

  const aksi = useMemo<Aksi>(() => {
    const entriKosong = () => ({ hadir: false, fisik: "" as const, kue: {} });

    const ubahEntri = (tgl: string, pid: string, fn: (e: DB["hari"][string][string], p: Penitip) => void) => {
      update((prev) => {
        const p = prev.penitip.find((x) => x.id === pid);
        if (!p) return prev;
        const hari = { ...prev.hari };
        const isiHari = { ...(hari[tgl] ?? {}) };
        const lama = isiHari[pid] ?? entriKosong();
        const baru = { ...lama, kue: { ...lama.kue } };
        fn(baru, p);
        isiHari[pid] = baru;
        hari[tgl] = isiHari;
        return { ...prev, hari };
      });
    };

    return {
      setHadir: (tgl, pid, hadir) =>
        ubahEntri(tgl, pid, (e) => {
          e.hadir = hadir;
        }),

      setNilaiKue: (tgl, pid, kid, field, nilai) =>
        ubahEntri(tgl, pid, (e, p) => {
          const km = p.kue.find((k) => k.id === kid);
          const lama = e.kue[kid] ?? {
            nama: km?.nama ?? "",
            nitip: "" as const,
            sisa: "" as const,
            setor: km?.setor ?? 0,
            jual: km?.jual ?? 0,
          };
          e.kue[kid] = { ...lama, [field]: nilai };
        }),

      setFisik: (tgl, pid, nilai) =>
        ubahEntri(tgl, pid, (e) => {
          e.fisik = nilai;
        }),

      ubahPenitip: (pid, ubah) =>
        update((prev) => ({
          ...prev,
          penitip: prev.penitip.map((p) => (p.id === pid ? { ...p, ...ubah } : p)),
        })),

      tambahPenitip: () => update((prev) => ({ ...prev, penitip: [...prev.penitip, penitipBaru()] })),

      hapusPenitip: (pid) =>
        update((prev) => ({ ...prev, penitip: prev.penitip.filter((p) => p.id !== pid) })),

      tambahKue: (pid) =>
        update((prev) => ({
          ...prev,
          penitip: prev.penitip.map((p) =>
            p.id === pid
              ? { ...p, kue: [...p.kue, { id: buatId(), nama: "Kue baru", setor: 1700, jual: 0 }] }
              : p,
          ),
        })),

      ubahKue: (pid, kid, ubah) =>
        update((prev) => ({
          ...prev,
          penitip: prev.penitip.map((p) =>
            p.id === pid
              ? { ...p, kue: p.kue.map((k) => (k.id === kid ? { ...k, ...ubah } : k)) }
              : p,
          ),
        })),

      hapusKue: (pid, kid) =>
        update((prev) => ({
          ...prev,
          penitip: prev.penitip.map((p) =>
            p.id === pid ? { ...p, kue: p.kue.filter((k) => k.id !== kid) } : p,
          ),
        })),

      setPengaturan: (profil, kunci, nilai) =>
        update((prev) => {
          const kunciDb = profil === "rekap" ? "pengaturanRekap" : "pengaturan";
          return {
            ...prev,
            [kunciDb]: { ...prev[kunciDb], [kunci]: nilai },
          };
        }),

      setGaya: (profil, kunci, prop, nilai) =>
        update((prev) => {
          const kunciDb = profil === "rekap" ? "pengaturanRekap" : "pengaturan";
          const lama = prev[kunciDb].gaya ?? {};
          const gayaBagian = { ...(lama[kunci] ?? {}), [prop]: nilai };
          return {
            ...prev,
            [kunciDb]: { ...prev[kunciDb], gaya: { ...lama, [kunci]: gayaBagian } },
          };
        }),

      resetPengaturan: (profil) =>
        update((prev) => {
          if (profil === "rekap") {
            return {
              ...prev,
              pengaturanRekap: { ...prev.pengaturanRekap, gaya: {} },
            };
          }
          return {
            ...prev,
            pengaturan: {
              ...prev.pengaturan,
              gaya: {},
            },
          };
        }),

      tutupPeriode: (pid, sampai) =>
        update((prev) => {
          const daftar = [...(prev.periode[pid] ?? []), { sampai }].sort((a, b) =>
            a.sampai.localeCompare(b.sampai),
          );
          return { ...prev, periode: { ...prev.periode, [pid]: daftar } };
        }),

      batalTutupPeriode: (pid) =>
        update((prev) => {
          const daftar = [...(prev.periode[pid] ?? [])].sort((a, b) => a.sampai.localeCompare(b.sampai));
          daftar.pop();
          return { ...prev, periode: { ...prev.periode, [pid]: daftar } };
        }),

      pulihkan: (jenis, teks) => {
        const dasar = dbRef.current;
        if (!dasar) return { ok: false, pesan: "Data belum siap." };
        const hasil = pulihkanCadangan(dasar, jenis, teks);
        if (hasil.ok && hasil.db) {
          setSalinanSebelum(JSON.stringify(dasar));
          pasangDb(hasil.db, false);
          simpanDB(hasil.db);
        }
        return hasil;
      },

      batalkanPulih: () => {
        if (!salinanSebelum) return false;
        try {
          const lama = normalisasiDB(JSON.parse(salinanSebelum), { longgar: true });
          pasangDb(lama, false);
          simpanDB(lama);
          setSalinanSebelum(null);
          return true;
        } catch {
          return false;
        }
      },

      bisaBatalPulih: !!salinanSebelum,

      hapusTanggal: (tgl) =>
        update((prev) => {
          const hari = { ...prev.hari };
          delete hari[tgl];
          return { ...prev, hari };
        }),

      hapusSemuaHari: () => update((prev) => ({ ...prev, hari: {}, periode: {} })),

      gantiTanggal: (tgl) => setTanggal(tgl || hariIni()),
    };
  }, [pasangDb, salinanSebelum, update]);

  const konteks = useMemo(() => (db ? buatKonteks(db) : { saldo: {} }), [db]);

  if (!siap || !db) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">Memuat catatan…</p>
      </div>
    );
  }

  return (
    <StoreContext.Provider
      value={{
        db,
        konteks,
        tanggal,
        ukuran,
        galatSimpan,
        sheet: { ...sheetStatus, config, aktif: !!config },
        hubungkanSheet,
        putuskanSheet,
        aksi,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

