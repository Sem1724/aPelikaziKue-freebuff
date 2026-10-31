"use client";

import { ELEMEN_HARIAN, ELEMEN_REKAP, type ElemenGaya } from "@/lib/defaults";
import { gaya } from "@/lib/gaya";
import { useStore } from "@/lib/store";
import type { Gaya, Profil, Settings } from "@/lib/types";
import { TombolYakin } from "@/components/tombol-yakin";

type Kelompok = { judul: string; isi: [keyof Settings, string][] };

const KELOMPOK_HARIAN: Kelompok[] = [
  { judul: "Judul laporan (PDF dan WhatsApp)", isi: [["judul", "Judul"]] },
  {
    judul: "Judul kolom tabel PDF",
    isi: [
      ["pdfKue", "Kolom kue"],
      ["pdfJumlah", "Kolom jumlah titipan"],
      ["pdfSisa", "Kolom sisa"],
      ["pdfLaku", "Kolom laku"],
      ["pdfHarga", "Kolom harga"],
      ["pdfUang", "Kolom uang"],
    ],
  },
  {
    judul: "Tulisan baris ringkasan PDF",
    isi: [
      ["pdfBrt", "Jumlah uang kue"],
      ["pdfTotal", "Total setelah saldo"],
      ["pdfDiterima", "Uang diterima"],
      ["pdfCatatan", "Catatan di bagian bawah"],
    ],
  },
  {
    judul: "Tulisan laporan WhatsApp",
    isi: [
      ["waNitip", "Kata “nitip”"],
      ["waSisa", "Kata “sisa”"],
      ["waLaku", "Kata “laku”"],
      ["waTotal", "Jumlah uang kue"],
      ["waHarus", "Harus disetor"],
      ["waDiterima", "Uang diterima"],
    ],
  },
  {
    judul: "Tulisan bersama (PDF dan WhatsApp)",
    isi: [
      ["kurang", "Kurang"],
      ["lebih", "Lebih"],
      ["tbh", "Kekurangan hari lalu"],
      ["ptg", "Potongan hari lalu"],
    ],
  },
];

const KELOMPOK_REKAP: Kelompok[] = [
  { judul: "Judul rekap (PDF dan WhatsApp)", isi: [["rkJudul", "Judul (pakai {nama} dan {periode})"]] },
  {
    judul: "Judul kolom tabel PDF rekap",
    isi: [
      ["rkTanggal", "Kolom tanggal"],
      ["pdfKue", "Kolom kue"],
      ["pdfJumlah", "Kolom jumlah titipan"],
      ["pdfSisa", "Kolom sisa"],
      ["pdfLaku", "Kolom laku"],
      ["pdfUang", "Kolom uang"],
    ],
  },
  {
    judul: "Tulisan baris tiap hari",
    isi: [
      ["pdfBrt", "Total uang kue hari itu"],
      ["tbh", "Kekurangan hari lalu"],
      ["ptg", "Potongan hari lalu"],
      ["pdfTotal", "Total setelah saldo"],
      ["pdfDiterima", "Uang diterima (masuk kotak)"],
      ["kurang", "Kurang"],
      ["lebih", "Lebih"],
    ],
  },
  {
    judul: "Tulisan ringkasan periode",
    isi: [
      ["rkLaku", "Total laku"],
      ["rkPeriode", "Total periode"],
      ["rkKotak", "Total uang di kotak"],
      ["rkKurangAkhir", "Kurang di akhir periode"],
      ["rkLebihAkhir", "Lebih di akhir periode"],
      ["pdfCatatan", "Catatan di bagian bawah"],
    ],
  },
  {
    judul: "Tulisan rekap untuk WhatsApp",
    isi: [
      ["waNitip", "Kata “nitip”"],
      ["waSisa", "Kata “sisa”"],
      ["waLaku", "Kata “laku”"],
      ["waTotal", "Jumlah uang kue"],
      ["waHarus", "Harus disetor"],
      ["waDiterima", "Uang diterima"],
    ],
  },
];

const NAMA_PROP: Record<keyof Gaya, string> = {
  tampil: "Tampilkan",
  warna: "Warna tulisan",
  latar: "Warna latar",
  tebal: "Tebal",
  miring: "Miring",
  rata: "Rata tulisan",
  rataNilai: "Rata angka",
  ukuran: "Ukuran huruf (5–20)",
  besar: "Semua HURUF BESAR",
  lebar: "Lebar kolom (mm, 0 = otomatis)",
};

const PILIHAN_RATA: [Gaya["rata"], string][] = [
  ["kiri", "Rata kiri"],
  ["tengah", "Rata tengah"],
  ["kanan", "Rata kanan"],
];

function KontrolGaya({ profil, elemen }: { profil: Profil; elemen: ElemenGaya }) {
  const { db, aksi } = useStore();
  const s = profil === "rekap" ? db.pengaturanRekap : db.pengaturan;
  const g = gaya(s, elemen.kunci);

  return (
    <div className="grid gap-x-4 gap-y-2 sm:grid-cols-2">
      {elemen.pilihan.map((prop) => {
        const nilai = g[prop];
        const label = NAMA_PROP[prop];
        const id = `${profil}-${elemen.kunci}-${prop}`;
        if (["tampil", "tebal", "miring", "besar"].includes(prop)) {
          return (
            <label key={prop} htmlFor={id} className="flex items-center gap-2 text-sm text-slate-700">
              <input
                id={id}
                type="checkbox"
                className="h-4 w-4 accent-teal-700"
                checked={Boolean(nilai)}
                onChange={(e) => aksi.setGaya(profil, elemen.kunci, prop, e.target.checked)}
              />
              {label}
            </label>
          );
        }
        if (prop === "warna" || prop === "latar") {
          return (
            <label key={prop} htmlFor={id} className="flex items-center justify-between gap-2 text-sm text-slate-700">
              {label}
              <input
                id={id}
                type="color"
                className="h-8 w-14 cursor-pointer rounded border border-slate-300 bg-white p-0.5"
                value={String(nilai)}
                onChange={(e) => aksi.setGaya(profil, elemen.kunci, prop, e.target.value)}
              />
            </label>
          );
        }
        if (prop === "rata" || prop === "rataNilai") {
          return (
            <label key={prop} htmlFor={id} className="flex items-center justify-between gap-2 text-sm text-slate-700">
              {label}
              <select
                id={id}
                className="input w-auto py-1.5"
                value={String(nilai)}
                onChange={(e) => aksi.setGaya(profil, elemen.kunci, prop, e.target.value)}
              >
                {PILIHAN_RATA.map(([v, n]) => (
                  <option key={v} value={v}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          );
        }
        return (
          <label key={prop} htmlFor={id} className="flex items-center justify-between gap-2 text-sm text-slate-700">
            {label}
            <input
              id={id}
              type="number"
              step="any"
              className="input w-24 py-1.5 text-right"
              value={Number(nilai)}
              onChange={(e) =>
                aksi.setGaya(profil, elemen.kunci, prop, e.target.value === "" ? 0 : Number(e.target.value))
              }
            />
          </label>
        );
      })}
    </div>
  );
}

export function PengaturanLaporan({ profil }: { profil: Profil }) {
  const { db, aksi } = useStore();
  const s = profil === "rekap" ? db.pengaturanRekap : db.pengaturan;
  const kelompok = profil === "rekap" ? KELOMPOK_REKAP : KELOMPOK_HARIAN;
  const elemen = profil === "rekap" ? ELEMEN_REKAP : ELEMEN_HARIAN;

  return (
    <div className="space-y-3">
      <div className="card px-4 py-3">
        <p className="text-sm text-slate-600">
          Perubahan tersimpan otomatis dan dipakai oleh PDF, teks WhatsApp
          {profil === "harian" ? ", serta tampilan tabel di tab Input Harian" : ""}.
        </p>
      </div>

      <details className="card group" open>
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-800">
          Tulisan laporan
          <span className="ml-2 text-xs font-normal text-slate-400">judul, kolom, kata</span>
        </summary>
        <div className="space-y-4 border-t border-slate-100 px-4 py-4">
          {kelompok.map((g) => (
            <div key={g.judul} className="space-y-2">
              <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">{g.judul}</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {g.isi.map(([kunci, label]) => (
                  <label key={String(kunci)} className="block">
                    <span className="label">{label}</span>
                    <input
                      className="input"
                      value={String(s[kunci] ?? "")}
                      onChange={(e) => aksi.setPengaturan(profil, kunci, e.target.value)}
                    />
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </details>

      <details className="card group">
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-800">
          Tampilan umum PDF
          <span className="ml-2 text-xs font-normal text-slate-400">huruf, lebar, garis</span>
        </summary>
        <div className="grid gap-3 border-t border-slate-100 px-4 py-4 sm:grid-cols-2">
          <label className="block">
            <span className="label">Jenis huruf</span>
            <select
              className="input"
              value={s.pdfFamily}
              onChange={(e) => aksi.setPengaturan(profil, "pdfFamily", e.target.value)}
            >
              <option value="helvetica">Helvetica (polos)</option>
              <option value="times">Times (berkaki)</option>
              <option value="courier">Courier (mesin tik)</option>
            </select>
          </label>
          <label className="block">
            <span className="label">Lebar halaman (mm, 60–210)</span>
            <input
              type="number"
              className="input"
              value={s.pdfLebar}
              onChange={(e) =>
                aksi.setPengaturan(profil, "pdfLebar", e.target.value === "" ? 0 : Number(e.target.value))
              }
            />
          </label>
          <label className="block">
            <span className="label">Garis tabel</span>
            <select
              className="input"
              value={s.pdfTema}
              onChange={(e) => aksi.setPengaturan(profil, "pdfTema", e.target.value)}
            >
              <option value="grid">Ada garis</option>
              <option value="plain">Tanpa garis</option>
            </select>
          </label>
          <label className="flex items-center justify-between gap-2 text-sm text-slate-700">
            Warna garis
            <input
              type="color"
              className="h-8 w-14 cursor-pointer rounded border border-slate-300 bg-white p-0.5"
              value={s.pdfWarnaGaris}
              onChange={(e) => aksi.setPengaturan(profil, "pdfWarnaGaris", e.target.value)}
            />
          </label>
          <label className="block">
            <span className="label">Tebal garis (mm)</span>
            <input
              type="number"
              step="0.05"
              className="input"
              value={s.pdfTebalGaris}
              onChange={(e) =>
                aksi.setPengaturan(profil, "pdfTebalGaris", e.target.value === "" ? 0 : Number(e.target.value))
              }
            />
          </label>
          <label className="block">
            <span className="label">Jarak antar tabel (mm)</span>
            <input
              type="number"
              className="input"
              value={s.pdfJarak}
              onChange={(e) =>
                aksi.setPengaturan(profil, "pdfJarak", e.target.value === "" ? 0 : Number(e.target.value))
              }
            />
          </label>
          <label className="block">
            <span className="label">Jarak tulisan ke tepi sel (mm)</span>
            <input
              type="number"
              step="0.1"
              className="input"
              value={s.pdfPadding}
              onChange={(e) =>
                aksi.setPengaturan(profil, "pdfPadding", e.target.value === "" ? 0 : Number(e.target.value))
              }
            />
          </label>
        </div>
      </details>

      <div className="card">
        <div className="px-4 py-3">
          <p className="text-sm font-semibold text-slate-800">Gaya tiap bagian</p>
          <p className="mt-0.5 text-xs text-slate-500">
            Warna, latar, tebal, miring, rata, dan ukuran huruf untuk setiap bagian laporan.
          </p>
        </div>
        <div className="divide-y divide-slate-100 border-t border-slate-100">
          {elemen.map((el) => (
            <details key={el.kunci} className="group">
              <summary className="flex cursor-pointer items-center justify-between px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50">
                <span>{el.nama}</span>
                <span className="text-xs text-slate-400 group-open:hidden">Atur</span>
              </summary>
              <div className="px-4 pb-4">
                <KontrolGaya profil={profil} elemen={el} />
              </div>
            </details>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <TombolYakin
          className="btn btn-secondary"
          pesanYakin="Tekan lagi untuk mengembalikan"
          onConfirm={() => aksi.resetPengaturan(profil)}
        >
          Kembalikan tampilan ke awal
        </TombolYakin>
        <span className="text-xs text-slate-500">Hanya tampilan yang direset; data dan tulisan tetap.</span>
      </div>
    </div>
  );
}
