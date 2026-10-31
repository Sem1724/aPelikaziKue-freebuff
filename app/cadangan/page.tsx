"use client";

import { useRef, useState } from "react";
import { CADANGAN_META, buatIsiCadangan, unduhTeks } from "@/lib/backup";
import { hariIni, namaTanggalPendek } from "@/lib/format";
import { ukuranTeks } from "@/lib/storage";
import { useStore } from "@/lib/store";
import type { JenisCadangan } from "@/lib/types";
import { TombolYakin } from "@/components/tombol-yakin";

const URUTAN: JenisCadangan[] = ["harian", "pengaturan", "master", "semua"];

export default function HalamanCadangan() {
  const { db, aksi, ukuran, cloud, keluar, sinkronSekarang } = useStore();
  const [info, setInfo] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const jenisRef = useRef<JenisCadangan>("semua");

  const [tglHapus, setTglHapus] = useState(hariIni());

  const tanggalAda = Object.keys(db.hari)
    .filter((t) => Object.values(db.hari[t]).some((e) => e.hadir))
    .sort();

  const unduh = (jenis: JenisCadangan) => {
    unduhTeks(`cadangan-${jenis}-${hariIni()}.json`, buatIsiCadangan(db, jenis));
    setInfo(`Cadangan ${CADANGAN_META[jenis].nama} diunduh.`);
  };

  const mintaPulih = (jenis: JenisCadangan) => {
    jenisRef.current = jenis;
    fileRef.current?.click();
  };

  const saatFile = async (ev: React.ChangeEvent<HTMLInputElement>) => {
    const berkas = ev.target.files?.[0];
    ev.target.value = "";
    if (!berkas) return;
    if (!window.confirm(`Pulihkan "${CADANGAN_META[jenisRef.current].nama}" dari file ini? Data sekarang akan diganti.`)) {
      return;
    }
    try {
      const teks = await berkas.text();
      const hasil = aksi.pulihkan(jenisRef.current, teks);
      setInfo(hasil.pesan);
    } catch {
      setInfo("File tidak bisa dibaca.");
    }
  };

  return (
    <div className="space-y-4">
      <p className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
        {cloud.aktif
          ? "Data otomatis tersinkron ke akun Firebase Anda, dan salinannya ada di browser perangkat ini. "
          : "Data tersimpan di browser perangkat ini. "}
        Tetap unduh cadangan secara berkala sebagai pengaman tambahan. Cadangan dibagi per bagian, dan file hanya bisa dipulihkan
        di bagian yang sama. Pulihkan Catatan Harian dan Data Master dari cadangan yang dibuat pada
        waktu yang sama.
      </p>

      <div className="card px-4 py-3 text-sm text-slate-600">
        Ukuran data saat ini: <b className="tabular-nums">{ukuranTeks(ukuran)}</b>{" "}
        <span className="text-xs text-slate-400">(batas browser biasanya sekitar 5 MB)</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {URUTAN.map((jenis) => {
          const meta = CADANGAN_META[jenis];
          return (
            <section key={jenis} className="card flex flex-col px-4 py-3">
              <p className="text-sm font-semibold text-slate-800">{meta.nama}</p>
              <p className="mt-0.5 flex-1 text-xs text-slate-500">{meta.keterangan}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" className="btn btn-primary btn-sm" onClick={() => unduh(jenis)}>
                  Unduh
                </button>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => mintaPulih(jenis)}>
                  Pulihkan
                </button>
              </div>
            </section>
          );
        })}
      </div>

      <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={saatFile} />

      {aksi.bisaBatalPulih && (
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => {
            const ok = aksi.batalkanPulih();
            setInfo(ok ? "Pemulihan dibatalkan. Data kembali seperti sebelumnya." : "Tidak ada yang bisa dibatalkan.");
          }}
        >
          Batalkan pemulihan terakhir
        </button>
      )}

      {info && (
        <p className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700" role="status">
          {info}
        </p>
      )}

      <section className="card">
        <div className="border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-800">Hapus catatan harian</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Menghapus nitip, sisa, dan uang fisik. Data Master tidak ikut terhapus.
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Tanggal yang ada catatan:{" "}
            {tanggalAda.length ? tanggalAda.map(namaTanggalPendek).join(", ") : "belum ada"}
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2 px-4 py-3">
          <label className="block">
            <span className="label">Pilih tanggal</span>
            <input type="date" className="input w-auto" value={tglHapus} onChange={(e) => setTglHapus(e.target.value)} />
          </label>
          <TombolYakin
            className="btn btn-danger"
            onConfirm={() => {
              if (!db.hari[tglHapus]) return setInfo("Tidak ada catatan pada tanggal itu.");
              aksi.hapusTanggal(tglHapus);
              setInfo(`Catatan ${namaTanggalPendek(tglHapus)} dihapus. Data Master tetap ada.`);
            }}
          >
            Hapus tanggal ini
          </TombolYakin>
          <TombolYakin
            className="btn btn-secondary"
            pesanYakin="Tekan lagi untuk hapus semua"
            onConfirm={() => {
              aksi.hapusSemuaHari();
              setInfo("Semua catatan harian dihapus. Data Master tetap ada.");
            }}
          >
            Hapus semua tanggal
          </TombolYakin>
        </div>
      </section>

      {cloud.aktif && (
        <section className="card">
          <div className="border-b border-slate-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-800">Akun dan sinkronisasi</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Masuk sebagai <b className="text-slate-700">{cloud.email}</b>. Catatan disimpan otomatis ke Firebase
              dan muncul di semua perangkat setelah Anda masuk dengan akun yang sama.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 px-4 py-3">
            <button type="button" className="btn btn-secondary" onClick={sinkronSekarang}>
              Sinkronkan sekarang
            </button>
            <TombolYakin className="btn btn-secondary" pesanYakin="Tekan lagi untuk keluar" onConfirm={keluar}>
              Keluar
            </TombolYakin>
            <span className={`text-xs ${cloud.galat ? "text-red-600" : "text-slate-500"}`}>
              {cloud.teks || "Tersambung"}
            </span>
          </div>
        </section>
      )}
    </div>
  );
}
