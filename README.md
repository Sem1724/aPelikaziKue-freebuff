# Ini Jalan. Kepake. Ati - Ati

Aplikasi web untuk mencatat titipan kue harian: nitip, sisa, uang fisik, laporan WhatsApp/PDF,
saldo kurang/lebih yang menggantung, dan rekap penitip yang dibayar per periode.

Versi ini adalah penulisan ulang dari aplikasi satu-file `v21.html` ke Next.js + TypeScript.
Seluruh fitur dan rumus uang tetap sama, tetapi kode dipisah menjadi modul yang bisa diuji.

## Nuku
- Ini cukup lengkap
- Domain pake Vercel
- Database pake Firebase

## Menjalankan

```bash
npm install
npm run dev      # http://localhost:3000
npm run build
npm start
npm run typecheck
```

## Unggah ke GitHub dan hosting Vercel

Tanpa Environment Variables Firebase, aplikasi berjalan dalam mode lokal (tanpa login, data hanya di
browser). Untuk mengaktifkan login dan sinkronisasi, isi variabel pada bagian "Firebase" di bawah.

1. Buat repositori kosong di GitHub (tanpa README), lalu di folder proyek:

   ```bash
   git init                       # hanya jika belum ada repositori git
   git add -A
   git commit -m "Catatan Titipan Kue dengan Next.js"
   git branch -M main
   git remote add origin https://github.com/<akun>/<repo>.git
   git push -u origin main
   ```

2. Di Vercel: **Add New → Project → Import** repositori tersebut. Framework terdeteksi otomatis
   sebagai Next.js dengan build `next build`; biarkan pengaturan default lalu **Deploy**.
3. Domain: **Project → Settings → Domains → Add**, lalu pasang record DNS yang ditampilkan Vercel
   di registrar Anda. Jika DNS dikelola Cloudflare, set record tersebut ke mode *DNS only*.

Perintah build yang dijalankan Vercel sama dengan yang dipakai di lokal, sehingga hasil
`npm run build` yang sukses menandakan deploy akan berhasil.

## Teknologi

- Next.js (App Router) + React 19 + TypeScript
- Tailwind CSS v4
- jsPDF + jspdf-autotable (dimuat dinamis, hanya saat membuat PDF)
- Penyimpanan: `localStorage` perangkat + sinkron ke Firebase (Authentication email/kata sandi dan Firestore, paket gratis Spark)

## Struktur

```
app/                    halaman per tab
  page.tsx              Input Harian
  laporan/              teks WhatsApp, PDF, pengaturan laporan
  keuntungan/           rekap setoran dan untung
  gantungan/            saldo kurang/lebih yang belum selesai
  rekap/                rekap per periode
  master/               penitip, kue, harga
  cadangan/             ekspor/impor, hapus tanggal, akun dan sinkronisasi
components/             UI (kartu penitip, form pengaturan, layar masuk, dsb.)
lib/
  types.ts              tipe data
  defaults.ts           data awal 19 penitip + gaya laporan
  calc.ts               rumus laku, uang, saldo, gantungan, rekap, untung
  report.ts             teks laporan & rekap untuk WhatsApp
  pdf.ts                pembuat PDF
  storage.ts            muat/simpan localStorage + normalisasi data lama
  backup.ts             file cadangan per bagian
  firebase.ts           inisialisasi Firebase dari Environment Variables
  cloud.ts              login dan baca/tulis Firestore (dengan cek versi)
  mampat.ts             kompresi gzip agar data muat di satu dokumen
  store.tsx             state aplikasi, aksi, login, dan sinkronisasi Firebase
```

## Rumus uang

```
laku          = nitip - sisa
uang          = laku x harga setor
saldo sebelum = saldo pada tanggal terakhir penitip menyerahkan uang fisik
harus disetor = total uang kue - saldo sebelum
saldo         = uang fisik - harus disetor
```

Saldo negatif berarti kurang (Tbh), positif berarti lebih (Ptg), dan terbawa ke hari berikutnya.
Harga setor disalin ke catatan harian saat pertama diisi, sehingga mengubah harga di Data Master
tidak mengubah laporan lama.

`lib/calc.ts` menghitung seluruh saldo berjalan satu kali per perubahan data (`buatKonteks`),
bukan menghitung mundur berulang seperti versi lama.

## Firebase (login dan sinkronisasi, gratis di paket Spark)

1. Firebase Console -> **Add project** -> **Build -> Firestore Database -> Create database**
   (mode produksi, lokasi `asia-southeast2`).
2. **Build -> Authentication -> Get started -> Email/Password -> Enable**, lalu tab **Users -> Add user**
   untuk membuat akun Anda sendiri. Matikan pendaftaran mandiri bila tersedia
   (Authentication -> Settings -> User actions -> *Enable create (sign-up)* dimatikan).
3. **Firestore -> Rules**: tempel isi `firestore.rules` lalu **Publish**.
4. **Project settings -> Your apps -> Web (`</>`)**: daftarkan aplikasi, salin `firebaseConfig`.
5. Isi `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`,
   `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID` di Vercel (lihat `.env.example`),
   lalu **Redeploy** (variabel `NEXT_PUBLIC_*` ikut terpasang saat build).

Cara kerja: seluruh data disimpan sebagai satu dokumen `pengguna/{uid}` (JSON dikompres gzip). Setiap
perubahan disimpan ke `localStorage` lebih dulu, lalu dikirim ke Firebase. Jika perangkat lain sudah
menyimpan lebih dulu, perubahan digabung per tanggal dan per penitip. Login pertama di perangkat yang
berisi data lama otomatis mengunggah data itu bila Firebase masih kosong.

## Data dan cadangan

- Data disimpan di `localStorage` (`catatanTitipanKue`) dan disinkronkan ke Firebase setelah login.
- Tombol simpan melaporkan kegagalan kuota/privasi; aplikasi tidak lagi menyimpan diam-diam.
- Cadangan dibagi per bagian (Catatan Harian, Pengaturan, Data Master, Semuanya) dan hanya bisa
  dipulihkan ke bagian yang sama. Pemulihan terakhir bisa dibatalkan.
- File cadangan versi lama (`v21.html`) tetap bisa dipulihkan: format lama dikenali dan
  dinormalisasi.
- Data terikat pada alamat situs. Pindah dari `*.vercel.app` ke domain sendiri (atau sebaliknya)
  tidak memindahkan data: buka alamat lama → **Cadangan → Unduh**, lalu di alamat baru →
  **Pulihkan**. Gunakan satu alamat saja agar catatan tidak terpecah.

## Catatan pengembangan

- `PREVIEW_HOSTNAME` (opsional) dipakai `next.config.ts` untuk mengizinkan origin preview lokal.
- Semua perhitungan berada di `lib/` dan tidak bergantung pada React, sehingga mudah dipindahkan
  ke backend atau diuji terpisah.
