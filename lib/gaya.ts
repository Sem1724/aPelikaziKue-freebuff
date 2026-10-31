import type { CSSProperties } from "react";
import { GAYA_DEF } from "./defaults";
import type { Gaya, Settings } from "./types";
import { batas } from "./format";

/** Gaya efektif satu bagian laporan: bawaan + simpanan pengguna, sudah dijepit ke batas aman. */
export function gaya(s: Settings, kunci: string): Gaya {
  const dasar = GAYA_DEF[kunci] ?? GAYA_DEF.kolKue;
  const g: Gaya = { ...dasar, ...(s.gaya?.[kunci] ?? {}) };
  g.ukuran = batas(g.ukuran, 5, 20, 8);
  g.lebar = batas(g.lebar, 0, 150, 0);
  if (!/^#[0-9a-fA-F]{6}$/.test(g.warna)) g.warna = "#000000";
  if (!/^#[0-9a-fA-F]{6}$/.test(g.latar)) g.latar = "#ffffff";
  if (!["kiri", "tengah", "kanan"].includes(g.rata)) g.rata = "kiri";
  if (!["kiri", "tengah", "kanan"].includes(g.rataNilai)) g.rataNilai = "kanan";
  return g;
}

export function hexKeRgb(hex: string): [number, number, number] {
  const bersih = /^#[0-9a-fA-F]{6}$/.test(hex) ? hex.slice(1) : "000000";
  const n = parseInt(bersih, 16);
  return [n >> 16, (n >> 8) & 255, n & 255];
}

export const RATA_JS = { kiri: "left", tengah: "center", kanan: "right" } as const;

/** Gaya CSS untuk tampilan tabel di layar (ukuran PDF x 1,75 menjadi piksel). */
export function gayaCss(g: Gaya, rata?: Gaya["rata"]): CSSProperties {
  return {
    color: g.warna,
    backgroundColor: g.latar,
    fontWeight: g.tebal ? "700" : "400",
    fontStyle: g.miring ? "italic" : "normal",
    textAlign: RATA_JS[rata ?? g.rata] ?? "left",
    fontSize: Math.round(g.ukuran * 1.75) + "px",
  };
}

/** Garis & padding tabel layar mengikuti pengaturan PDF. */
export function tabelCss(s: Settings): { tabel: CSSProperties; sel: CSSProperties } {
  const garis =
    s.pdfTema === "plain"
      ? "none"
      : Math.max(1, Math.round(batas(s.pdfTebalGaris, 0.05, 1, 0.1) * 8)) + "px solid " + s.pdfWarnaGaris;
  const pad = (batas(s.pdfPadding, 0, 5, 1.2) * 3.2 + 1).toFixed(1) + "px";
  return { tabel: { borderCollapse: "collapse", width: "100%" }, sel: { border: garis, padding: pad } };
}

export const KELUARGA_HURUF: Record<string, string> = {
  helvetica: "Helvetica, Arial, sans-serif",
  times: "'Times New Roman', Times, serif",
  courier: "'Courier New', Courier, monospace",
};
