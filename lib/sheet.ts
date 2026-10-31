import { KUNCI_SHEET } from "./storage";

/** Klien tipis untuk Apps Script (Google Sheet). Alamat & kunci hanya disimpan di perangkat. */

export type SheetConfig = { url: string; kunci: string };

export type Jawaban = {
  ok: boolean;
  versi?: number;
  data?: unknown;
  pesan?: string;
  konflik?: boolean;
};

const TIMEOUT_MS = 20000;

export function muatConfigSheet(): SheetConfig | null {
  if (typeof window === "undefined") return null;
  try {
    const mentah = window.localStorage.getItem(KUNCI_SHEET);
    if (!mentah) return null;
    const isi = JSON.parse(mentah);
    if (!isi || typeof isi.url !== "string" || !isi.url) return null;
    return { url: isi.url, kunci: typeof isi.kunci === "string" ? isi.kunci : "" };
  } catch {
    return null;
  }
}

export function simpanConfigSheet(cfg: SheetConfig | null): void {
  if (typeof window === "undefined") return;
  try {
    if (cfg) window.localStorage.setItem(KUNCI_SHEET, JSON.stringify(cfg));
    else window.localStorage.removeItem(KUNCI_SHEET);
  } catch {
    /* pengaturan tetap hidup selama halaman terbuka */
  }
}

export async function panggilSheet(
  cfg: SheetConfig,
  aksi: string,
  tambahan: Record<string, unknown> = {},
  timeoutMs = TIMEOUT_MS,
): Promise<Jawaban> {
  const kendali = new AbortController();
  const timer = setTimeout(() => kendali.abort(), timeoutMs);
  try {
    const res = await fetch(cfg.url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ kunci: cfg.kunci, aksi, ...tambahan }),
      signal: kendali.signal,
    });
    if (!res.ok) throw new Error(`Server Sheets menjawab ${res.status}`);
    const teks = await res.text();
    try {
      return JSON.parse(teks) as Jawaban;
    } catch {
      throw new Error("Jawaban Sheets bukan JSON. Periksa alamat Apps Script.");
    }
  } finally {
    clearTimeout(timer);
  }
}
