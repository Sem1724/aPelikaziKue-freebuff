import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import {
  doc,
  getDoc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  type DocumentSnapshot,
} from "firebase/firestore";
import { ambilAuth, ambilDb } from "./firebase";
import { bisaMampat, bukaMampat, mampatkan } from "./mampat";

/**
 * Satu dokumen per pengguna: pengguna/{uid} -> { gz | json: string, versi: number, diubah }.
 * `gz` = JSON dikompres gzip (base64); `json` = JSON polos (dipakai jika browser tak mendukung kompresi).
 */
const KOLEKSI = "pengguna";
const BATAS_MS = 20000;
/** Batas aman isi dokumen (Firestore membatasi 1 MiB per dokumen). */
const BATAS_BYTE = 900_000;

export type Pengguna = { uid: string; email: string };

const kePengguna = (u: User | null): Pengguna | null =>
  u ? { uid: u.uid, email: u.email ?? "" } : null;

export function pantauMasuk(panggil: (p: Pengguna | null) => void): () => void {
  return onAuthStateChanged(ambilAuth(), (u) => panggil(kePengguna(u)));
}

export async function masukEmail(email: string, sandi: string): Promise<void> {
  await signInWithEmailAndPassword(ambilAuth(), email.trim(), sandi);
}

export async function keluarAkun(): Promise<void> {
  await signOut(ambilAuth());
}

export function pesanGalatMasuk(e: unknown): string {
  const kode = typeof e === "object" && e && "code" in e ? String((e as { code: unknown }).code) : "";
  switch (kode) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
    case "auth/invalid-email":
      return "Email atau kata sandi salah.";
    case "auth/too-many-requests":
      return "Terlalu banyak percobaan. Tunggu beberapa menit, lalu coba lagi.";
    case "auth/network-request-failed":
      return "Tidak ada koneksi internet. Coba lagi saat online.";
    case "auth/user-disabled":
      return "Akun ini dinonaktifkan.";
    default:
      return "Gagal masuk. Coba lagi." + (kode ? ` (${kode})` : "");
  }
}

export type DokCloud = { ada: boolean; versi: number; data: string };

async function dariSnap(snap: DocumentSnapshot): Promise<DokCloud> {
  if (!snap.exists()) return { ada: false, versi: 0, data: "" };
  const d = snap.data() as { json?: unknown; gz?: unknown; versi?: unknown };
  const versi = typeof d.versi === "number" ? d.versi : 0;
  if (typeof d.gz === "string") return { ada: true, versi, data: await bukaMampat(d.gz) };
  if (typeof d.json === "string") return { ada: true, versi, data: d.json };
  return { ada: false, versi, data: "" };
}

function denganBatas<T>(janji: Promise<T>, ms = BATAS_MS): Promise<T> {
  return new Promise<T>((selesai, gagal) => {
    const t = setTimeout(() => gagal(new Error("waktu habis")), ms);
    janji.then(
      (v) => {
        clearTimeout(t);
        selesai(v);
      },
      (e) => {
        clearTimeout(t);
        gagal(e);
      },
    );
  });
}

export async function bacaCloud(uid: string): Promise<DokCloud> {
  const snap = await denganBatas(getDoc(doc(ambilDb(), KOLEKSI, uid)));
  return await dariSnap(snap);
}

/** Dengarkan perubahan dari perangkat lain. Mengembalikan fungsi untuk berhenti mendengarkan. */
export function pantauCloud(
  uid: string,
  saatBerubah: (d: DokCloud) => void,
  saatGalat: (e: unknown) => void,
): () => void {
  return onSnapshot(
    doc(ambilDb(), KOLEKSI, uid),
    (snap) => {
      if (snap.metadata.hasPendingWrites) return;
      dariSnap(snap).then(saatBerubah, saatGalat);
    },
    saatGalat,
  );
}

export type HasilTulis =
  | { ok: true; versi: number }
  | { ok: false; konflik: true; versi: number; data: string };

/**
 * Tulis hanya jika versi di server masih sama dengan versi dasar kita.
 * Jika berbeda (perangkat lain sudah menyimpan), kembalikan data server agar digabung.
 */
export async function tulisCloud(uid: string, versiDasar: number, json: string): Promise<HasilTulis> {
  const ref = doc(ambilDb(), KOLEKSI, uid);
  const isi = bisaMampat() ? { gz: await mampatkan(json) } : { json };
  if ((isi.gz ?? isi.json).length > BATAS_BYTE) throw new Error("terlalu besar");
  return denganBatas(
    runTransaction(ambilDb(), async (tx): Promise<HasilTulis> => {
      const snap = await tx.get(ref);
      const server = await dariSnap(snap);
      if (server.ada && server.versi !== versiDasar) {
        return { ok: false, konflik: true, versi: server.versi, data: server.data };
      }
      const versiBaru = server.versi + 1;
      tx.set(ref, { ...isi, versi: versiBaru, diubah: serverTimestamp() });
      return { ok: true, versi: versiBaru };
    }),
  );
}
