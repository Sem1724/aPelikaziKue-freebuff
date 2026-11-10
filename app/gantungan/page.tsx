"use client";

import { useMemo, useState } from "react";
import { hitungGantungan } from "@/lib/calc";
import { hariIni, labelTgl, labelSaldo, rp, selisihHari } from "@/lib/format";
import { useStore } from "@/lib/store";
import { Stat } from "@/components/stat";

export default function HalamanGantungan() {
  const { db, konteks } = useStore();
  const [batasHari, setBatasHari] = useState(7);

  const daftar = useMemo(() => {
    return hitungGantungan(db, konteks).sort((a, b) => {
      const tglA = a.rantai[a.rantai.length - 1]?.tgl ?? "";
      const tglB = b.rantai[b.rantai.length - 1]?.tgl ?? "";
      return tglA.localeCompare(tglB);
    });
  }, [db, konteks]);

  const kurang = daftar.reduce((a, d) => (d.saldo < 0 ? a - d.saldo : a), 0);
  const lebih = daftar.reduce((a, d) => (d.saldo > 0 ? a + d.saldo : a), 0);
  const hariIniTeks = hariIni();

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-center gap-3 px-4 py-3">
        <label className="flex items-center gap-2 text-sm text-slate-600">
          Tandai merah jika sudah lebih dari
          <input
            type="number"
            min={1}
            className="input w-20 py-1.5 text-right"
            value={batasHari}
            onChange={(e) => setBatasHari(Math.max(1, Number(e.target.value) || 1))}
          />
          hari tidak nitip
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Stat
          label="Total kurang"
          nilai={rp(kurang)}
          nada={kurang ? "kurang" : "netral"}
          keterangan="Uang yang belum diterima"
        />
        <Stat
          label="Total lebih"
          nilai={rp(lebih)}
          nada={lebih ? "lebih" : "netral"}
          keterangan="Uang yang sudah diterima lebih dulu"
        />
      </div>

      {daftar.length === 0 ? (
        <div className="card px-6 py-10 text-center">
          <p className="font-medium text-slate-700">Tidak ada saldo yang menggantung.</p>
          <p className="mt-1 text-sm text-slate-500">Semua penitip sudah Pas.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {daftar.map((d) => {
            const akhir = d.rantai[d.rantai.length - 1];
            const hari = selisihHari(akhir.tgl, hariIniTeks);
            return (
              <section key={d.pid} className="card overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                  <span className="text-sm font-semibold text-slate-800">{d.nama}</span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums ${
                      d.saldo < 0 ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"
                    }`}
                  >
                    {labelSaldo(d.saldo)}
                  </span>
                </div>
                <div className="border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
                  <p>
                    Gantungan terakhir: {labelTgl(akhir.tgl)}{" "}
                    <span className={hari >= batasHari ? "font-semibold text-red-600" : ""}>
                      ({hari} hari lalu)
                    </span>
                  </p>
                </div>
              </section>
            );
          })}
        </div>
      )}

      <p className="text-xs text-slate-500">
        Yang tampil hanya gantungan terakhir tiap penitip. Hilang dari daftar ini setelah penitip nitip lagi dan uang fisiknya Pas.
      </p>
    </div>
  );
}
