"use client";

import { useStore } from "@/lib/store";
import type { Penitip } from "@/lib/types";
import { TombolYakin } from "@/components/tombol-yakin";

function BlokPenitip({ p }: { p: Penitip }) {
  const { aksi } = useStore();

  return (
    <section className="card">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-3">
        <input
          className="input min-w-40 flex-1 font-semibold"
          value={p.nama}
          aria-label="Nama penitip"
          onChange={(e) => aksi.ubahPenitip(p.id, { nama: e.target.value })}
        />
        <label className="flex items-center gap-1.5 text-xs text-slate-600">
          <input
            type="checkbox"
            className="h-4 w-4 accent-teal-700"
            checked={!!p.rekap}
            onChange={(e) => aksi.ubahPenitip(p.id, { rekap: e.target.checked })}
          />
          Dibayar per periode
        </label>
        <TombolYakin
          className="btn btn-danger btn-sm"
          judul={`Hapus ${p.nama}`}
          onConfirm={() => aksi.hapusPenitip(p.id)}
        >
          Hapus
        </TombolYakin>
      </div>

      <div className="px-4 py-3">
        <div className="grid grid-cols-[1fr_5.5rem_5.5rem_2rem] items-center gap-2 text-[11px] font-medium tracking-wide text-slate-400 uppercase">
          <span>Kue</span>
          <span className="text-right">Setor</span>
          <span className="text-right">Jual</span>
          <span />
        </div>

        {p.kue.length === 0 && (
          <p className="mt-2 text-sm text-slate-500">Belum ada kue. Tambahkan lewat tombol di bawah.</p>
        )}

        {p.kue.map((k) => (
          <div key={k.id} className="mt-2 grid grid-cols-[1fr_5.5rem_5.5rem_2rem] items-center gap-2">
            <input
              className="input input-sm"
              value={k.nama}
              aria-label={`Nama kue untuk ${p.nama}`}
              onChange={(e) => aksi.ubahKue(p.id, k.id, { nama: e.target.value })}
            />
            <input
              type="number"
              min={0}
              inputMode="numeric"
              className="input input-sm text-right tabular-nums"
              placeholder="0"
              value={k.setor === 0 ? "" : k.setor}
              aria-label={`Harga setor ${k.nama}`}
              onChange={(e) => aksi.ubahKue(p.id, k.id, { setor: Number(e.target.value) || 0 })}
            />
            <input
              type="number"
              min={0}
              inputMode="numeric"
              className="input input-sm text-right tabular-nums"
              placeholder="0"
              value={k.jual || ""}
              aria-label={`Harga jual ${k.nama}`}
              onChange={(e) => aksi.ubahKue(p.id, k.id, { jual: Number(e.target.value) || 0 })}
            />
            <TombolYakin
              className="btn btn-ghost btn-sm justify-center text-red-600"
              pesanYakin="?"
              judul={`Hapus kue ${k.nama}`}
              onConfirm={() => aksi.hapusKue(p.id, k.id)}
            >
              ×
            </TombolYakin>
          </div>
        ))}

        <button type="button" className="btn btn-secondary btn-sm mt-3" onClick={() => aksi.tambahKue(p.id)}>
          + Tambah kue
        </button>
        <p className="mt-2 text-[11px] text-slate-400">
          Harga jual boleh dikosongkan; kue itu dihitung untung Rp 0.
        </p>
      </div>
    </section>
  );
}

export default function HalamanMaster() {
  const { db, aksi } = useStore();

  return (
    <div className="space-y-4">
      <p className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
        Harga setor dipakai di laporan dan input harian. Harga jual hanya untuk menghitung keuntungan
        Anda. Perubahan nama atau harga tidak mengubah catatan lama karena harga disalin per tanggal.
      </p>

      {db.penitip.map((p) => (
        <BlokPenitip key={p.id} p={p} />
      ))}

      <button type="button" className="btn btn-primary" onClick={aksi.tambahPenitip}>
        + Tambah penitip
      </button>
    </div>
  );
}
