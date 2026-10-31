"use client";

import Link from "next/link";
import { ringkas } from "@/lib/calc";
import { namaTanggal, rp } from "@/lib/format";
import { useStore } from "@/lib/store";
import { KartuPenitip } from "@/components/kartu-penitip";
import { Stat } from "@/components/stat";

export default function HalamanInput() {
  const { db, konteks, tanggal } = useStore();

  const semua = db.penitip.map((p) => ({ p, r: ringkas(db, konteks, tanggal, p) }));
  const hadir = semua.filter((x) => x.r.hadir);
  const total = hadir.reduce((a, x) => a + x.r.total, 0);
  const belum = hadir.filter((x) => x.r.baris.some((b) => !b.siap)).length;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat
          label="Penitip hadir"
          nilai={`${hadir.length} / ${db.penitip.length}`}
          keterangan={namaTanggal(tanggal)}
        />
        <Stat label="Uang kue hari ini" nilai={rp(total)} keterangan="Jumlah setoran semua penitip" />
        <Stat
          label="Sisa belum diisi"
          nilai={belum}
          keterangan={belum ? "Lengkapi agar laporan tepat" : "Semua sisa sudah diisi"}
          nada={belum ? "peringatan" : "lebih"}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-teal-200 bg-teal-50/70 px-4 py-3">
        <p className="text-sm text-teal-900">
          Centang penitip yang nitip, lalu isi <b>Jumlah</b> dan <b>Sisa</b>. Kolom laku, uang, dan
          saldo dihitung otomatis.
        </p>
        <Link href="/laporan" className="btn btn-secondary btn-sm shrink-0">
          Lihat laporan
        </Link>
      </div>

      {db.penitip.length === 0 ? (
        <div className="card px-6 py-10 text-center">
          <p className="font-medium text-slate-700">Belum ada penitip.</p>
          <p className="mt-1 text-sm text-slate-500">Tambahkan penitip pertama di tab Data Master.</p>
          <Link href="/master" className="btn btn-primary mt-4">
            Buka Data Master
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {db.penitip.map((p) => (
            <KartuPenitip key={p.id} p={p} />
          ))}
        </div>
      )}
    </div>
  );
}
