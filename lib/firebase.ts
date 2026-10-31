import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

/**
 * Konfigurasi Firebase dibaca dari Environment Variables (NEXT_PUBLIC_*).
 * Nilai ini bukan rahasia; pengamannya adalah login + Firestore Security Rules.
 * Jika belum diisi, aplikasi tetap jalan dalam mode lokal (tanpa login & tanpa sinkron).
 */
const konfigurasi = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseAktif = Boolean(
  konfigurasi.apiKey && konfigurasi.authDomain && konfigurasi.projectId && konfigurasi.appId,
);

function ambilApp(): FirebaseApp {
  return getApps().length ? getApp() : initializeApp(konfigurasi);
}

export function ambilAuth(): Auth {
  return getAuth(ambilApp());
}

export function ambilDb(): Firestore {
  return getFirestore(ambilApp());
}
