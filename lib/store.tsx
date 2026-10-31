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
import { KUNCI_DASAR, KUNCI_SEBELUM, muatDB, normalisasiDB, simpanDB, ukuranData } from "./storage";
import { pulihkanCadangan, type HasilPulih } from "./backup";
import { firebaseAktif } from "./firebase";
import {
  bacaCloud,
  keluarAkun,
  pantauCloud,
  pantauMasuk,
  tulisCloud,
  type DokCloud,
  type Pengguna,
} from "./cloud";
import { LayarMasuk } from "@/components/layar-masuk";

type StatusCloud = { teks: string; galat: boolean };

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
  cloud: StatusCloud & { aktif: boolean; email: string };
  keluar: () => void;
  sinkronSekarang: () => void;
  aksi: Aksi;
};

const StoreContext = createContext<NilaiStore | null>(null);

export function useStore(): NilaiStore {
  const v = useContext(StoreContext);
  if (!v) throw new Error("useStore dipakai di luar StoreProvider");
  return v;
}

const adaIsi = (o: object) => Object.keys(o).length > 0;

function bacaLokal(kunci: string): string | null {
  try {
    return window.localStorage.getItem(kunci);
  } catch {
    return null;
  }
}

function tulisLokal(kunci: string, nilai: string): void {
  try {
    window.localStorage.setItem(kunci, nilai);
  } catch {
    /* kuota penuh: abaikan, hanya mengurangi ketepatan penggabungan */
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<DB | null>(null);
  const [siap, setSiap] = useState(false);
  const [tanggal, setTanggal] = useState(() => hariIni());
  const [galatSimpan, setGalatSimpan] = useState<string | null>(null);
  const [ukuran, setUkuran] = useState(0);
  const [cloudStatus, setCloudStatus] = useState<StatusCloud>({ teks: "", galat: false });
  const [salinanSebelum, setSalinanSebelum] = useState<string | null>(null);
  const [pengguna, setPengguna] = useState<Pengguna | null>(null);
  const [authSiap, setAuthSiap] = useState(!firebaseAktif);

  const dbRef = useRef<DB | null>(null);
  const terakhirRef = useRef<string>("");
  const remoteRef = useRef(false);

  // Sinkronisasi Firebase
  const uidRef = useRef<string | null>(null);
  const versiRef = useRef<number | null>(null);
  const dasarRef = useRef<string | null>(null);
  const kotorRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sedangRef = useRef(false);
  const tundaRef = useRef(false);

  const setStatus = useCallback((teks: string, galat = false) => {
    setCloudStatus({ teks, galat });
  }, []);

  const pasangDb = useCallback((baru: DB, dariRemote = true) => {
    dbRef.current = baru;
    terakhirRef.current = JSON.stringify(baru);
    // dariRemote = true: jangan kirim balik ke Firebase (data baru saja datang dari sana).
    remoteRef.current = dariRemote;
    setDb(baru);
  }, []);

  const simpanDasar = useCallback((json: string) => {
    if (uidRef.current) tulisLokal(KUNCI_DASAR + ":" + uidRef.current, json);
  }, []);

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
    if (!uidRef.current || versiRef.current === null) return;
    tundaRef.current = true;
    if (timerRef.current) clearTimeout(timerRef.current);
    setStatus("Menyimpan ke Firebase…");
    timerRef.current = setTimeout(() => void dorongRef.current?.(0), 1500);
  }, [setStatus]);

  const dorong = useCallback(
    async (percobaan: number) => {
      const uid = uidRef.current;
      if (!uid || versiRef.current === null) return;
      if (sedangRef.current) {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => void dorongRef.current?.(0), 1000);
        return;
      }
      tundaRef.current = false;
      sedangRef.current = true;
      const kirim = JSON.stringify(dbRef.current);
      try {
        const r = await tulisCloud(uid, versiRef.current, kirim);
        if (r.ok) {
          versiRef.current = r.versi;
          dasarRef.current = kirim;
          simpanDasar(kirim);
          const masihKotor = JSON.stringify(dbRef.current) !== kirim;
          kotorRef.current = masihKotor;
          if (masihKotor) jadwalDorong();
          else setStatus("Tersimpan " + jamSekarang());
        } else {
          // Perangkat lain sudah menyimpan lebih dulu: gabungkan perubahan kita ke data server.
          let server: DB;
          try {
            server = normalisasiDB(JSON.parse(r.data), { longgar: true });
          } catch {
            setStatus("Firebase: data dari perangkat lain tidak bisa dibaca.", true);
            sedangRef.current = false;
            return;
          }
          const dasar = dasarRef.current ? (JSON.parse(dasarRef.current) as DB) : null;
          if (!dasar && dbRef.current) tulisLokal(KUNCI_SEBELUM, JSON.stringify(dbRef.current));
          const hasil = dasar ? gabung(dasar, dbRef.current as DB, server) : server;
          versiRef.current = r.versi;
          dasarRef.current = JSON.stringify(server);
          simpanDasar(dasarRef.current);
          kotorRef.current = true;
          pasangDb(hasil);
          simpanDB(hasil);
          setStatus("Digabung dengan perubahan dari perangkat lain " + jamSekarang());
          sedangRef.current = false;
          if (percobaan < 3) {
            await dorongRef.current?.(percobaan + 1);
            return;
          }
        }
      } catch (e) {
        if (e instanceof Error && e.message === "terlalu besar") {
          setStatus("Firebase: data terlalu besar. Unduh cadangan, lalu hapus tanggal lama di menu Cadangan.", true);
        } else {
          const pesan = e instanceof Error && e.message === "waktu habis" ? "waktu habis" : "gagal";
          setStatus(`Firebase: ${pesan} menyimpan, dicoba lagi. Data tetap aman di perangkat ini.`, true);
          if (timerRef.current) clearTimeout(timerRef.current);
          timerRef.current = setTimeout(() => void dorongRef.current?.(0), 10000);
        }
      }
      sedangRef.current = false;
    },
    [gabung, jadwalDorong, pasangDb, setStatus, simpanDasar],
  );

  const dorongRef = useRef(dorong);
  dorongRef.current = dorong;

  /** Terapkan data dari server, sambil menjaga perubahan lokal yang belum terkirim. */
  const terapkanServer = useCallback(
    (r: DokCloud) => {
      const server = normalisasiDB(JSON.parse(r.data), { longgar: true });
      const serverJson = JSON.stringify(server);
      const lokal = dbRef.current as DB;
      const lokalJson = JSON.stringify(lokal);
      const uid = uidRef.current;
      const dasarJson = dasarRef.current ?? (uid ? bacaLokal(KUNCI_DASAR + ":" + uid) : null);

      let hasil = server;
      if (lokalJson !== serverJson) {
        if (dasarJson) {
          // Pernah sinkron: gabungkan hanya perubahan lokal sejak sinkron terakhir.
          if (lokalJson !== dasarJson) {
            hasil = gabung(normalisasiDB(JSON.parse(dasarJson)), lokal, server);
          }
        } else if (!adaIsi(server.hari) && adaIsi(lokal.hari)) {
          // Firebase masih kosong, perangkat ini sudah berisi catatan: pakai milik perangkat ini.
          hasil = gabung(server, lokal, server);
        } else {
          // Perangkat baru: data Firebase dipakai; data lokal disimpan sebagai salinan jaga-jaga.
          tulisLokal(KUNCI_SEBELUM, lokalJson);
        }
      }
      const perluKirim = JSON.stringify(hasil) !== serverJson;
      versiRef.current = r.versi;
      dasarRef.current = serverJson;
      simpanDasar(serverJson);
      kotorRef.current = perluKirim;
      pasangDb(hasil);
      simpanDB(hasil);
      if (perluKirim) void dorongRef.current?.(0);
    },
    [gabung, pasangDb, simpanDasar],
  );

  const tarik = useCallback(async () => {
    const uid = uidRef.current;
    if (!uid) return;
    if (kotorRef.current && versiRef.current !== null) {
      await dorongRef.current?.(0);
      return;
    }
    setStatus("Firebase: membaca…");
    try {
      const r = await bacaCloud(uid);
      if (!r.ada) {
        // Belum ada data di Firebase: unggah data perangkat ini.
        versiRef.current = 0;
        dasarRef.current = null;
        kotorRef.current = true;
        await dorongRef.current?.(0);
        return;
      }
      if (versiRef.current === r.versi && !kotorRef.current) {
        setStatus("Tersinkron " + jamSekarang());
        return;
      }
      terapkanServer(r);
      setStatus("Tersinkron " + jamSekarang());
    } catch {
      setStatus("Firebase: gagal terhubung. Data tetap tersimpan di perangkat ini.", true);
    }
  }, [setStatus, terapkanServer]);

  const segarkan = useCallback(() => {
    if (!uidRef.current) return;
    void tarik();
  }, [tarik]);

  const keluar = useCallback(() => {
    void keluarAkun();
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

  /* ===== status login ===== */
  useEffect(() => {
    if (!firebaseAktif) return;
    return pantauMasuk((p) => {
      setPengguna(p);
      setAuthSiap(true);
    });
  }, []);

  /* ===== simpan lokal + tandai perubahan untuk Firebase ===== */
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

  /* ===== sambungkan ke Firebase setelah login ===== */
  const uidPengguna = pengguna?.uid ?? null;
  useEffect(() => {
    if (!siap || !uidPengguna) return;
    uidRef.current = uidPengguna;
    versiRef.current = null;
    dasarRef.current = null;
    kotorRef.current = false;
    let batal = false;
    let lepas: (() => void) | null = null;

    void (async () => {
      await tarik();
      if (batal) return;
      // Dengarkan perubahan dari perangkat lain.
      lepas = pantauCloud(
        uidPengguna,
        (r) => {
          if (!r.ada || versiRef.current === null || r.versi === versiRef.current) return;
          if (kotorRef.current || sedangRef.current || tundaRef.current) return;
          try {
            terapkanServer(r);
            setStatus("Diperbarui dari perangkat lain " + jamSekarang());
          } catch {
            setStatus("Firebase: data dari perangkat lain tidak bisa dibaca.", true);
          }
        },
        () => setStatus("Firebase: sambungan terputus. Data tetap tersimpan di perangkat ini.", true),
      );
    })();

    return () => {
      batal = true;
      lepas?.();
      uidRef.current = null;
      versiRef.current = null;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siap, uidPengguna]);

  /* ===== segarkan saat aplikasi dibuka kembali ===== */
  useEffect(() => {
    if (!siap) return;
    const saatTampil = () => {
      if (!document.hidden) segarkan();
    };
    document.addEventListener("visibilitychange", saatTampil);
    window.addEventListener("online", segarkan);
    return () => {
      document.removeEventListener("visibilitychange", saatTampil);
      window.removeEventListener("online", segarkan);
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
          jadwalDorong();
        }
        return hasil;
      },

      batalkanPulih: () => {
        if (!salinanSebelum) return false;
        try {
          const lama = normalisasiDB(JSON.parse(salinanSebelum), { longgar: true });
          pasangDb(lama, false);
          simpanDB(lama);
          jadwalDorong();
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
  }, [jadwalDorong, pasangDb, salinanSebelum, update]);

  const konteks = useMemo(() => (db ? buatKonteks(db) : { saldo: {} }), [db]);

  if (!siap || !db || !authSiap) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">Memuat catatan…</p>
      </div>
    );
  }

  if (firebaseAktif && !pengguna) return <LayarMasuk />;

  return (
    <StoreContext.Provider
      value={{
        db,
        konteks,
        tanggal,
        ukuran,
        galatSimpan,
        cloud: { ...cloudStatus, aktif: firebaseAktif && !!pengguna, email: pengguna?.email ?? "" },
        keluar,
        sinkronSekarang: segarkan,
        aksi,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

