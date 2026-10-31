/** Kompres teks (gzip) lalu ubah ke base64 agar muat banyak di satu dokumen Firestore (batas 1 MB). */

export const bisaMampat = () =>
  typeof CompressionStream !== "undefined" && typeof DecompressionStream !== "undefined";

export async function mampatkan(teks: string): Promise<string> {
  const aliran = new Blob([teks]).stream().pipeThrough(new CompressionStream("gzip"));
  const buf = new Uint8Array(await new Response(aliran).arrayBuffer());
  let biner = "";
  for (let i = 0; i < buf.length; i += 0x8000) {
    biner += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  }
  return btoa(biner);
}

export async function bukaMampat(b64: string): Promise<string> {
  const biner = atob(b64);
  const buf = new Uint8Array(biner.length);
  for (let i = 0; i < biner.length; i++) buf[i] = biner.charCodeAt(i);
  const aliran = new Blob([buf]).stream().pipeThrough(new DecompressionStream("gzip"));
  return await new Response(aliran).text();
}
