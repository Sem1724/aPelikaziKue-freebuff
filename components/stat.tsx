import type { ReactNode } from "react";

type Nada = "netral" | "kurang" | "lebih" | "peringatan";

const WARNA: Record<Nada, string> = {
  netral: "text-slate-900",
  kurang: "text-red-700",
  lebih: "text-emerald-700",
  peringatan: "text-amber-700",
};

export function Stat({
  label,
  nilai,
  keterangan,
  nada = "netral",
}: {
  label: string;
  nilai: ReactNode;
  keterangan?: string;
  nada?: Nada;
}) {
  return (
    <div className="card px-4 py-3">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className={`mt-1 text-xl font-semibold tabular-nums ${WARNA[nada]}`}>{nilai}</p>
      {keterangan && <p className="mt-0.5 text-xs text-slate-500">{keterangan}</p>}
    </div>
  );
}
