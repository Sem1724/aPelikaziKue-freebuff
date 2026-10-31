# Catatan Titipan Kue

Aplikasi web untuk mencatat titipan kue harian: nitip, sisa, uang fisik, laporan WhatsApp/PDF,
saldo kurang/lebih yang menggantung, dan rekap penitip yang dibayar per periode.

Versi ini adalah penulisan ulang dari aplikasi satu-file `v21.html` ke Next.js + TypeScript.
Seluruh fitur dan rumus uang tetap sama, tetapi kode dipisah menjadi modul yang bisa diuji.

## Menjalankan

```bash
npm install
npm run dev      # http://localhost:3000
npm run build
npm start
npm run typecheck
```

## Unggah ke GitHub dan hosting Vercel

Proyek ini siap deploy tanpa variabel lingkungan apa pun (`PREVIEW_HOSTNAME` hanya dipakai saat
development lokal).

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
- Penyimpanan: `localStorage` perangkat; sinkron opsional ke Google Apps Script/Sheet

## Struktur

```
app/                    halaman per tab
  page.tsx              Input Harian
  laporan/              teks WhatsApp, PDF, pengaturan laporan
  keuntungan/           rekap setoran dan untung
  gantungan/            saldo kurang/lebih yang belum selesai
  rekap/                rekap per periode
  master/               penitip, kue, harga
  cadangan/             ekspor/impor, hapus tanggal, Google Sheet
components/             UI (kartu penitip, form pengaturan, dsb.)
lib/
  types.ts              tipe data
  defaults.ts           data awal 19 penitip + gaya laporan
  calc.ts               rumus laku, uang, saldo, gantungan, rekap, untung
  report.ts             teks laporan & rekap untuk WhatsApp
  pdf.ts                pembuat PDF
  storage.ts            muat/simpan localStorage + normalisasi data lama
  backup.ts             file cadangan per bagian
  sheet.ts              klien Apps Script
  store.tsx             state aplikasi, aksi, dan sinkronisasi Sheet
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

## Data dan cadangan

- Data disimpan di `localStorage` (`catatanTitipanKue`), bukan di server.
- Tombol simpan melaporkan kegagalan kuota/privasi; aplikasi tidak lagi menyimpan diam-diam.
- Cadangan dibagi per bagian (Catatan Harian, Pengaturan, Data Master, Semuanya) dan hanya bisa
  dipulihkan ke bagian yang sama. Pemulihan terakhir bisa dibatalkan.
- File cadangan versi lama (`v21.html`) tetap bisa dipulihkan: format lama dikenali dan
  dinormalisasi.
- Data terikat pada alamat situs. Pindah dari `*.vercel.app` ke domain sendiri (atau sebaliknya)
  tidak memindahkan data: buka alamat lama → **Cadangan → Unduh**, lalu di alamat baru →
  **Pulihkan**. Gunakan satu alamat saja agar catatan tidak terpecah.

## Google Sheet (opsional)

Isi alamat Apps Script dan kunci di tab Cadangan. Protokolnya sama dengan versi sebelumnya
(`baca`, `versi`, `tulis`) dan mendukung penggabungan perubahan dari beberapa perangkat per
tanggal/per penitip, dengan batas waktu 20 detik agar tidak macet.

## Catatan pengembangan

- `PREVIEW_HOSTNAME` (opsional) dipakai `next.config.ts` untuk mengizinkan origin preview lokal.
- Semua perhitungan berada di `lib/` dan tidak bergantung pada React, sehingga mudah dipindahkan
  ke backend atau diuji terpisah.
