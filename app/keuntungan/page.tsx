"use client";

import { useMemo, useState } from "react";
import { hitungUntung } from "@/lib/calc";
import { awalBulan, namaTanggalPendek, rp } from "@/lib/format";
import { useStore } from "@/lib/store";
import { Stat } from "@/components/stat";

export default function HalamanKeuntungan() {
  const { db, konteks, tanggal } = useStore();
  const [dari, setDari] = useState(() => awalBulan(tanggal));
  const [sampai, setSampai] = useState(tanggal);

  const awal = dari <= sampai ? dari : sampai;
  const akhir = dari <= sampai ? sampai : dari;
  const hasil = useMemo(() => hitungUntung(db, konteks, awal, akhir), [db, konteks, awal, akhir]);

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-end gap-3 px-4 py-3">
        <label className="block">
          <span className="label">Dari tanggal</span>
          <input type="date" className="input w-auto" value={dari} onChange={(e) => setDari(e.target.value)} />
        </label>
        <label className="block">
          <span className="label">Sampai tanggal</span>
          <input type="date" className="input w-auto" value={sampai} onChange={(e) => setSampai(e.target.value)} />
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Stat label="Total harga setor" nilai={rp(hasil.setor)} keterangan="Uang kue seluruh periode" />
        <Stat label="Total keuntungan" nilai={rp(hasil.untung)} keterangan="Hanya untuk Anda" nada="lebih" />
      </div>

      <p className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500">
        Keuntungan sudah memperhitungkan Tbh/Ptg (kurang atau lebih hari lalu), sesuai uang yang
        benar-benar keluar. Tabel per kue hanya margin penjualan.
      </p>

      <section className="card overflow-hidden">
        <h2 className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-800">Per hari</h2>
        <div className="overflow-x-auto">
          <table className="table-data min-w-full">
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Setor</th>
                <th>Untung</th>
              </tr>
            </thead>
            <tbody>
              {hasil.perHari.length === 0 ? (
                <tr>
                  <td colSpan={3} className="text-center text-slate-500">
                    Belum ada catatan pada rentang ini.
                  </td>
                </tr>
              ) : (
                hasil.perHari.map((h) => (
                  <tr key={h.tgl}>
                    <td>{namaTanggalPendek(h.tgl)}</td>
                    <td>{rp(h.setor)}</td>
                    <td>{rp(h.untung)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card overflow-hidden">
        <h2 className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-800">Per penitip</h2>
        <div className="overflow-x-auto">
          <table className="table-data min-w-full">
            <thead>
              <tr>
                <th>Penitip</th>
                <th>Laku</th>
                <th>Setor</th>
                <th>Untung</th>
              </tr>
            </thead>
            <tbody>
              {hasil.perPenitip.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center text-slate-500">
                    Belum ada data.
                  </td>
                </tr>
              ) : (
                hasil.perPenitip.map((x) => (
                  <tr key={x.nama}>
                    <td>{x.nama}</td>
                    <td>{x.laku}</td>
                    <td>{rp(x.uang)}</td>
                    <td>{rp(x.untung)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card overflow-hidden">
        <h2 className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-800">
          Per kue <span className="text-xs font-normal text-slate-400">paling laku di atas</span>
        </h2>
        <div className="overflow-x-auto">
          <table className="table-data min-w-full">
            <thead>
              <tr>
                <th>Kue</th>
                <th>Laku</th>
                <th>Untung</th>
              </tr>
            </thead>
            <tbody>
              {hasil.perKue.length === 0 ? (
                <tr>
                  <td colSpan={3} className="text-center text-slate-500">
                    Belum ada data.
                  </td>
                </tr>
              ) : (
                hasil.perKue.map((x) => (
                  <tr key={x.nama}>
                    <td>{x.nama}</td>
                    <td>{x.laku}</td>
                    <td>{rp(x.untung)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <p className="text-xs text-slate-500">
        Kue tanpa harga jual di Data Master dihitung untung Rp 0, tetapi tetap masuk total setor.
      </p>
    </div>
  );
}
