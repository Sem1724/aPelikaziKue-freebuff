import type { DB, EntriHari, KueHari, Penitip } from "./types";

/**
 * Semua perhitungan uang ada di sini dan bersifat murni (tanpa React/DOM),
 * sehingga mudah diuji dan dipakai ulang oleh layar, WhatsApp, dan PDF.
 *
 * Aturan:
 *   laku          = nitip - sisa
 *   uang          = laku x harga setor
 *   saldo sebelum = saldo pada tanggal terakhir penitip itu menyerahkan uang fisik
 *   harus disetor = total - saldo sebelum
 *   saldo         = uang fisik - harus disetor   (negatif = kurang, positif = lebih)
 */

export type Baris = {
  id: string;
  nama: string;
  setor: number;
  nitip: number;
  sisa: number | null;
  siap: boolean;
  laku: number;
  uang: number;
  untung: number;
};

export type Ringkasan = {
  hadir: boolean;
  baris: Baris[];
  total: number;
  untung: number;
  sebelum: number;
  tglSebelum: string | null;
  harus: number;
  fisik: number | null;
  saldo: number | null;
  untungSaldo: number;
};

export type SaldoHari = { tgl: string; saldo: number };

export type Konteks = { saldo: Record<string, SaldoHari[]> };

const angkaAtauNol = (v: number | "" | null | undefined): number => {
  if (v === "" || v === null || v === undefined) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const sisaTerisi = (v: number | "" | null | undefined): boolean =>
  v !== "" && v !== null && v !== undefined && Number.isFinite(Number(v));

/** Satu baris kue pada satu entri harian. */
function susunBaris(p: Penitip, e: EntriHari): Baris[] {
  const baris: Baris[] = [];
  const kueHari = e.kue || {};
  // Urutan mengikuti Data Master; kue yang sudah dihapus dari master tetap tampil di akhir.
  const ids = [
    ...p.kue.map((k) => k.id),
    ...Object.keys(kueHari).filter((id) => !p.kue.some((k) => k.id === id)),
  ];
  ids.forEach((id) => {
    const c: KueHari | undefined = kueHari[id];
    if (!c) return;
    const nitip = angkaAtauNol(c.nitip);
    if (nitip <= 0) return;
    const siap = sisaTerisi(c.sisa);
    const sisa = siap ? angkaAtauNol(c.sisa) : null;
    const laku = siap ? nitip - (sisa ?? 0) : 0;
    const setor = angkaAtauNol(c.setor);
    const uang = laku * setor;
    const km = p.kue.find((k) => k.id === id);
    const jual = angkaAtauNol(c.jual) > 0 ? angkaAtauNol(c.jual) : (km?.jual ?? 0);
    const untung = jual > 0 ? laku * (jual - setor) : 0;
    baris.push({ id, nama: c.nama, setor, nitip, sisa, siap, laku, uang, untung });
  });
  return baris;
}

/** Total uang kue satu hari, tanpa memperhitungkan saldo hari sebelumnya. */
export function totalMurni(p: Penitip, e: EntriHari): number {
  return susunBaris(p, e).reduce((a, b) => a + b.uang, 0);
}

/**
 * Hitung saldo berjalan sekali untuk semua penitip dan semua tanggal.
 * Dengan begitu layar tidak perlu menghitung ulang rantai saldo setiap kali
 * mengetik (versi lama menghitung mundur berulang kali).
 */
export function buatKonteks(db: DB): Konteks {
  const saldo: Record<string, SaldoHari[]> = {};
  const tanggal = Object.keys(db.hari).sort();
  db.penitip.forEach((p) => {
    const daftar: SaldoHari[] = [];
    let sebelumnya = 0;
    tanggal.forEach((tgl) => {
      const e = db.hari[tgl]?.[p.id];
      if (!e?.hadir) return;
      const fisik = e.fisik === "" || e.fisik === null || e.fisik === undefined ? null : Number(e.fisik);
      if (fisik === null || !Number.isFinite(fisik)) return;
      const total = totalMurni(p, e);
      const s = fisik - (total - sebelumnya);
      daftar.push({ tgl, saldo: s });
      sebelumnya = s;
    });
    saldo[p.id] = daftar;
  });
  return { saldo };
}

function saldoSebelum(ctx: Konteks, pid: string, tgl: string): SaldoHari | null {
  const daftar = ctx.saldo[pid] || [];
  for (let i = daftar.length - 1; i >= 0; i--) {
    if (daftar[i].tgl < tgl) return daftar[i];
  }
  return null;
}

export function ringkas(db: DB, ctx: Konteks, tgl: string, p: Penitip): Ringkasan {
  const e = db.hari[tgl]?.[p.id];
  const hadir = !!e?.hadir;
  const baris = hadir && e ? susunBaris(p, e) : [];
  const total = baris.reduce((a, b) => a + b.uang, 0);
  const untung = baris.reduce((a, b) => a + b.untung, 0);

  const saldoLalu = hadir ? saldoSebelum(ctx, p.id, tgl) : null;
  const sebelum = saldoLalu?.saldo ?? 0;
  const tglSebelum = saldoLalu?.tgl ?? null;
  const harus = total - sebelum;

  const fisikAngka =
    hadir && e && e.fisik !== "" && e.fisik !== null && e.fisik !== undefined ? Number(e.fisik) : NaN;
  const fisik = Number.isFinite(fisikAngka) ? fisikAngka : null;
  const saldo = fisik === null ? null : fisik - harus;

  return {
    hadir,
    baris,
    total,
    untung,
    sebelum,
    tglSebelum,
    harus,
    fisik,
    saldo,
    // Keuntungan ikut menyesuaikan pada hari uang fisik diisi, sesuai uang yang benar-benar keluar.
    untungSaldo: hadir && fisik !== null ? sebelum : 0,
  };
}

export type Gantungan = { pid: string; nama: string; saldo: number; rantai: SaldoHari[] };

/** Saldo kurang/lebih yang belum selesai, beserta rantai tanggalnya. */
export function hitungGantungan(db: DB, ctx: Konteks): Gantungan[] {
  const hasil: Gantungan[] = [];
  db.penitip.forEach((p) => {
    const daftar = ctx.saldo[p.id] || [];
    const akhir = daftar[daftar.length - 1];
    if (!akhir || akhir.saldo === 0) return;
    const rantai: SaldoHari[] = [];
    for (let i = daftar.length - 1; i >= 0 && daftar[i].saldo !== 0; i--) {
      rantai.unshift(daftar[i]);
    }
    hasil.push({ pid: p.id, nama: p.nama, saldo: akhir.saldo, rantai });
  });
  return hasil;
}

/* ===== Rekap per periode ===== */

export type RekapHari = { tgl: string; r: Ringkasan };

export type RekapPeriode = {
  rinci: RekapHari[];
  sampai: string | null;
  /** tanggal pertama periode; tetap terisi walau hari pertama disembunyikan */
  tglPertama: string | null;
  /** true bila hari pertama tidak ikut ke PDF/teks (hanya kurang/lebihnya yang dibawa) */
  awalDisembunyikan: boolean;
  total: number;
  kotak: number;
  laku: number;
  awal: number;
  tglAwal: string | null;
  akhir: number;
  /** tanggal yang uang kotaknya belum diisi */
  kosong: string[];
};

function hitungRekap(
  rinci: RekapHari[],
  sampai: string | null,
  tglPertama: string | null,
  awalDisembunyikan: boolean,
  awalCadangan?: { saldo: number; tgl: string },
): RekapPeriode {
  const total = rinci.reduce((a, x) => a + x.r.total, 0);
  const kotak = rinci.reduce((a, x) => a + (x.r.fisik ?? 0), 0);
  const laku = rinci.reduce((a, x) => a + x.r.baris.reduce((b, k) => b + (k.siap ? k.laku : 0), 0), 0);
  const awal = rinci.length ? rinci[0].r.sebelum : (awalCadangan?.saldo ?? 0);
  const tglAwal = rinci.length ? rinci[0].r.tglSebelum : (awalCadangan?.tgl ?? null);
  let akhir = awal;
  rinci.forEach((x) => {
    if (x.r.fisik !== null && x.r.saldo !== null) akhir = x.r.saldo;
  });
  return {
    rinci,
    sampai,
    tglPertama,
    awalDisembunyikan,
    total,
    kotak,
    laku,
    awal,
    tglAwal,
    akhir,
    kosong: rinci.filter((x) => x.r.fisik === null).map((x) => x.tgl),
  };
}

export function riwayatRekap(db: DB, ctx: Konteks, p: Penitip): RekapPeriode[] {
  const tutup = (db.periode?.[p.id] || []).slice().sort((a, b) => a.sampai.localeCompare(b.sampai));
  const tglAda = Object.keys(db.hari)
    .filter((t) => db.hari[t]?.[p.id]?.hadir)
    .sort();

  const hasil: RekapPeriode[] = [];
  let mulai = "";

  const buat = (sampai: string | null): RekapPeriode => {
    const rinci = tglAda
      .filter((t) => t > mulai && (!sampai || t <= sampai))
      .map((t) => ({ tgl: t, r: ringkas(db, ctx, t, p) }))
      .filter((x) => x.r.baris.length);
    return hitungRekap(rinci, sampai, rinci.length ? rinci[0].tgl : null, false);
  };

  tutup.forEach((c) => {
    hasil.push(buat(c.sampai));
    mulai = c.sampai;
  });
  hasil.push(buat(null));
  return hasil;
}

/**
 * Hari pertama periode hanya bisa disembunyikan bila uang fisiknya sudah diisi,
 * karena kurang/lebih yang dibawa ke hari berikutnya baru ada setelah itu.
 */
export function bisaSembunyikanAwal(it: RekapPeriode): boolean {
  return it.rinci.length > 0 && it.rinci[0].r.saldo !== null;
}

export function awalSedangDisembunyikan(db: DB, pid: string, it: RekapPeriode): boolean {
  return !!it.tglPertama && !!db.sembunyiAwal?.[pid]?.includes(it.tglPertama) && bisaSembunyikanAwal(it);
}

/**
 * Rekap untuk PDF dan teks WhatsApp: hari pertama dibuang, lalu kurang/lebih hari itu
 * menjadi saldo awal periode sehingga angka akhir tetap sama dengan rekap lengkap.
 */
export function rekapTanpaHariPertama(it: RekapPeriode): RekapPeriode {
  if (!bisaSembunyikanAwal(it)) return it;
  const pertama = it.rinci[0];
  return hitungRekap(it.rinci.slice(1), it.sampai, it.tglPertama, true, {
    saldo: pertama.r.saldo ?? 0,
    tgl: pertama.tgl,
  });
}

export function rentangRekap(it: RekapPeriode): string {
  const awal = it.tglPertama ? labelTglRingkas(it.tglPertama) : "-";
  const akhir = it.sampai ? labelTglRingkas(it.sampai) : "sekarang";
  return `${awal} - ${akhir}`;
}

function labelTglRingkas(tgl: string): string {
  const [y, b, h] = tgl.split("-");
  return `${h}/${b}/${y}`;
}

/* ===== Keuntungan ===== */

export type BarisHari = { tgl: string; setor: number; untung: number };
export type BarisPenitip = { nama: string; laku: number; uang: number; untung: number };
export type BarisKue = { nama: string; laku: number; untung: number };

export type HasilUntung = {
  setor: number;
  untung: number;
  perHari: BarisHari[];
  perPenitip: BarisPenitip[];
  perKue: BarisKue[];
};

export function hitungUntung(db: DB, ctx: Konteks, dari: string, sampai: string): HasilUntung {
  const perPenitip = new Map<string, BarisPenitip>();
  const perKue = new Map<string, BarisKue>();
  const perHari: BarisHari[] = [];
  let setor = 0;
  let untung = 0;

  Object.keys(db.hari)
    .filter((t) => t >= dari && t <= sampai)
    .sort()
    .forEach((t) => {
      let setorHari = 0;
      let untungHari = 0;
      db.penitip.forEach((p) => {
        const r = ringkas(db, ctx, t, p);
        r.baris.forEach((b) => {
          const a = perPenitip.get(p.nama) || { nama: p.nama, laku: 0, uang: 0, untung: 0 };
          a.laku += b.laku;
          a.uang += b.uang;
          a.untung += b.untung;
          perPenitip.set(p.nama, a);

          const kk = `${p.nama} - ${b.nama}`;
          const x = perKue.get(kk) || { nama: kk, laku: 0, untung: 0 };
          x.laku += b.laku;
          x.untung += b.untung;
          perKue.set(kk, x);
        });
        if (r.hadir && r.untungSaldo) {
          const a = perPenitip.get(p.nama) || { nama: p.nama, laku: 0, uang: 0, untung: 0 };
          a.untung += r.untungSaldo;
          perPenitip.set(p.nama, a);
        }
        setorHari += r.total;
        untungHari += r.untung + r.untungSaldo;
      });
      perHari.push({ tgl: t, setor: setorHari, untung: untungHari });
      setor += setorHari;
      untung += untungHari;
    });

  return {
    setor,
    untung,
    perHari,
    perPenitip: [...perPenitip.values()].sort((a, b) => b.uang - a.uang),
    perKue: [...perKue.values()].sort((a, b) => b.laku - a.laku),
  };
}
