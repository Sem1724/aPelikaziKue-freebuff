/** Pemformat angka, tanggal, dan label saldo. Semua memakai locale Indonesia. */

export function rp(n: number): string {
  if (!Number.isFinite(n)) return "Rp 0";
  return "Rp " + Math.round(n).toLocaleString("id-ID");
}

export function angkaRapi(n: number): string {
  return Math.round(n).toLocaleString("id-ID");
}

/** Tanggal lokal hari ini dalam format YYYY-MM-DD (bukan UTC). */
export function hariIni(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** 2026-10-22 -> "22/10/2026" */
export function labelTgl(tgl: string): string {
  if (!tgl) return "-";
  const [y, b, h] = tgl.split("-");
  return `${h}/${b}/${y}`;
}

/** 2026-10-22 -> "Kamis, 22 Oktober 2026" */
export function namaTanggal(tgl: string): string {
  if (!tgl) return "-";
  return new Date(tgl + "T00:00:00").toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function namaTanggalPendek(tgl: string): string {
  if (!tgl) return "-";
  return new Date(tgl + "T00:00:00").toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function labelSaldo(saldo: number | null): string {
  if (saldo === null) return "-";
  if (saldo === 0) return "Pas";
  return saldo < 0 ? "Kurang " + rp(-saldo) : "Lebih " + rp(saldo);
}

export function kelasSaldo(saldo: number | null): "minus" | "plus" | "netral" {
  if (saldo === null || saldo === 0) return "netral";
  return saldo < 0 ? "minus" : "plus";
}

/** Selisih hari (boleh negatif). */
export function selisihHari(dari: string, sampai: string): number {
  if (!dari || !sampai) return 0;
  return Math.round(
    (new Date(sampai + "T00:00:00").getTime() - new Date(dari + "T00:00:00").getTime()) / 86400000,
  );
}

/** Awal bulan dari sebuah tanggal (YYYY-MM-01). */
export function awalBulan(tgl: string): string {
  return tgl.slice(0, 8) + "01";
}

export function jamSekarang(d: Date = new Date()): string {
  return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

export function batas(v: unknown, min: number, max: number, awal: number): number {
  if (v === "" || v === null || v === undefined) return awal;
  const n = Number(v);
  if (!Number.isFinite(n)) return awal;
  return Math.min(max, Math.max(min, n));
}
