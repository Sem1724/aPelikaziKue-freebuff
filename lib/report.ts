import type { DB, Penitip, Settings } from "./types";
import type { Konteks, RekapPeriode, Ringkasan } from "./calc";
import { rentangRekap, ringkas } from "./calc";
import { labelTgl, namaTanggal, rp } from "./format";

/** Label saldo hari lalu, mis. "Tbh (20/10/2026)". */
export function labelSebelum(saldo: number, tgl: string | null, s: Settings): string {
  const nama = saldo < 0 ? s.tbh : saldo > 0 ? s.ptg : "Saldo sebelumnya";
  return tgl ? `${nama} (${labelTgl(tgl)})` : nama;
}

/** Teks laporan harian untuk grup WhatsApp. Keuntungan tidak pernah dimasukkan. */
export function buatTeksLaporan(db: DB, ctx: Konteks, s: Settings, tgl: string): string {
  const bagian: string[] = [];
  db.penitip.forEach((p) => {
    const r = ringkas(db, ctx, tgl, p);
    if (!r.hadir || !r.baris.length) return;
    const g: string[] = ["*" + p.nama + "*"];
    r.baris.forEach((b) =>
      g.push(
        `- ${b.nama}: ${s.waNitip} ${b.nitip}, ${s.waSisa} ${b.siap ? b.sisa : "?"}, ${s.waLaku} ${b.laku} = ${rp(b.uang)}`,
      ),
    );
    g.push(`${s.waTotal}: ${rp(r.total)}`);
    if (r.sebelum !== 0) {
      g.push(`${labelSebelum(r.sebelum, r.tglSebelum, s)}: ${rp(Math.abs(r.sebelum))}`);
      g.push(`${s.waHarus}: ${rp(r.harus)}`);
    }
    if (r.fisik !== null) {
      g.push(`${s.waDiterima}: ${rp(r.fisik)}`);
      if (r.saldo !== null && r.saldo !== 0) {
        g.push(`${r.saldo < 0 ? s.kurang : s.lebih}: ${rp(Math.abs(r.saldo))}`);
      }
    }
    bagian.push(g.join("\n"));
  });
  return `${s.judul}\n${namaTanggal(tgl)}\n\n${bagian.join("\n\n") || "(belum ada data)"}`;
}

export function judulRekap(it: RekapPeriode, p: Penitip, s: Settings): string {
  return s.rkJudul.replace("{nama}", p.nama).replace("{periode}", rentangRekap(it));
}

export type BarisRekap = {
  kunci: string;
  teksPdf: string;
  teksWa: string;
  teksLayar: string;
  nilai: string;
  nada: "minus" | "plus" | "netral";
};

export function barisHariRekap(r: Ringkasan, s: Settings): BarisRekap[] {
  const e: BarisRekap[] = [];
  e.push({
    kunci: "rBrt",
    teksPdf: s.pdfBrt,
    teksWa: s.waTotal,
    teksLayar: s.pdfBrt,
    nilai: rp(r.total),
    nada: "netral",
  });
  if (r.sebelum !== 0) {
    const lb = labelSebelum(r.sebelum, r.tglSebelum, s);
    e.push({
      kunci: r.sebelum < 0 ? "rTbh" : "rPtg",
      teksPdf: lb,
      teksWa: lb,
      teksLayar: lb,
      nilai: rp(Math.abs(r.sebelum)),
      nada: "netral",
    });
    e.push({
      kunci: "rTotal",
      teksPdf: s.pdfTotal,
      teksWa: s.waHarus,
      teksLayar: s.pdfTotal,
      nilai: rp(r.harus),
      nada: "netral",
    });
  }
  if (r.fisik === null) {
    e.push({
      kunci: "rDiterima",
      teksPdf: s.pdfDiterima,
      teksWa: s.waDiterima,
      teksLayar: s.pdfDiterima,
      nilai: "belum diisi",
      nada: "minus",
    });
  } else {
    e.push({
      kunci: "rDiterima",
      teksPdf: s.pdfDiterima,
      teksWa: s.waDiterima,
      teksLayar: s.pdfDiterima,
      nilai: rp(r.fisik),
      nada: "netral",
    });
    if (r.saldo !== null && r.saldo !== 0) {
      const kurang = r.saldo < 0;
      const label = kurang ? s.kurang : s.lebih;
      e.push({
        kunci: kurang ? "rKurang" : "rLebih",
        teksPdf: label,
        teksWa: label + " (ke hari berikutnya)",
        teksLayar: label + " (ke hari berikutnya)",
        nilai: rp(Math.abs(r.saldo)),
        nada: kurang ? "minus" : "plus",
      });
    }
  }
  return e;
}

export function barisPeriodeRekap(it: RekapPeriode, s: Settings): BarisRekap[] {
  const e: BarisRekap[] = [];
  e.push({
    kunci: "pLaku",
    teksPdf: s.rkLaku,
    teksWa: s.rkLaku,
    teksLayar: s.rkLaku,
    nilai: String(it.laku),
    nada: "netral",
  });
  e.push({
    kunci: "pPeriode",
    teksPdf: s.rkPeriode,
    teksWa: s.rkPeriode,
    teksLayar: s.rkPeriode,
    nilai: rp(it.total),
    nada: "netral",
  });
  if (it.awal !== 0) {
    const lb = labelSebelum(it.awal, it.tglAwal, s);
    e.push({
      kunci: it.awal < 0 ? "pAwalTbh" : "pAwalPtg",
      teksPdf: lb,
      teksWa: lb,
      teksLayar: lb,
      nilai: rp(Math.abs(it.awal)),
      nada: "netral",
    });
  }
  e.push({
    kunci: "pKotak",
    teksPdf: s.rkKotak,
    teksWa: s.rkKotak,
    teksLayar: s.rkKotak,
    nilai: rp(it.kotak),
    nada: "netral",
  });
  if (it.akhir !== 0) {
    const kurang = it.akhir < 0;
    const label = kurang ? s.rkKurangAkhir : s.rkLebihAkhir;
    e.push({
      kunci: kurang ? "pAkhirKurang" : "pAkhirLebih",
      teksPdf: label,
      teksWa: label,
      teksLayar: label,
      nilai: rp(Math.abs(it.akhir)),
      nada: kurang ? "minus" : "plus",
    });
  }
  return e;
}

export function buatTeksRekap(it: RekapPeriode, p: Penitip, s: Settings): string {
  const g: string[] = [judulRekap(it, p, s), ""];
  it.rinci.forEach((x) => {
    g.push("*" + labelTgl(x.tgl) + "*");
    x.r.baris.forEach((k) =>
      g.push(
        `- ${k.nama}: ${s.waNitip} ${k.nitip}, ${s.waSisa} ${k.siap ? k.sisa : "?"}, ${s.waLaku} ${k.laku} = ${rp(k.uang)}`,
      ),
    );
    barisHariRekap(x.r, s).forEach((b) => g.push(`${b.teksWa}: ${b.nilai}`));
    g.push("");
  });
  barisPeriodeRekap(it, s).forEach((b) => g.push(`${b.teksWa}: ${b.nilai}`));
  return g.join("\n");
}
