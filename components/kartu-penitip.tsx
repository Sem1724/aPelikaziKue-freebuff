"use client";

import type { CSSProperties } from "react";
import { ringkas } from "@/lib/calc";
import { gaya, gayaCss, tabelCss, KELUARGA_HURUF } from "@/lib/gaya";
import { rp, labelTgl } from "@/lib/format";
import { labelSebelum } from "@/lib/report";
import { useStore } from "@/lib/store";
import type { Gaya, Penitip } from "@/lib/types";

const keAngka = (v: string): number | "" => {
  if (v === "") return "";
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, n) : "";
};

/** Satu kartu penitip pada tab Input Harian. */
export function KartuPenitip({ p }: { p: Penitip }) {
  const { db, konteks, tanggal, aksi } = useStore();
  const s = db.pengaturan;
  const r = ringkas(db, konteks, tanggal, p);
  const entri = db.hari[tanggal]?.[p.id];
  const { tabel, sel } = tabelCss(s);

  const kolom = [
    { kunci: "kolKue", judul: s.pdfKue },
    { kunci: "kolJumlah", judul: s.pdfJumlah },
    { kunci: "kolSisa", judul: s.pdfSisa },
    { kunci: "kolLaku", judul: s.pdfLaku },
    { kunci: "kolHarga", judul: s.pdfHarga },
    { kunci: "kolUang", judul: s.pdfUang },
  ].filter((k) => gaya(s, k.kunci).tampil !== false);
  const n = kolom.length;
  const gk = kolom.map((k) => gaya(s, k.kunci));
  const gh = gaya(s, "kepala");

  const Baris = ({
    kunci,
    label,
    nilai,
    children,
  }: {
    kunci: string;
    label: string;
    nilai?: string;
    children?: React.ReactNode;
  }) => {
    const g: Gaya = gaya(s, kunci);
    if (g.tampil === false) return null;
    return (
      <tr>
        <td colSpan={Math.max(1, n - 1)} style={{ ...gayaCss(g), ...sel }}>
          {label}
        </td>
        <td style={{ ...gayaCss(g, g.rataNilai), ...sel } as CSSProperties}>
          {children ?? nilai ?? ""}
        </td>
      </tr>
    );
  };

  return (
    <section className="card overflow-hidden">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-3 py-2.5 sm:px-4">
        <input
          id={`hadir-${p.id}`}
          type="checkbox"
          className="h-5 w-5 shrink-0 accent-teal-700"
          checked={r.hadir}
          onChange={(e) => aksi.setHadir(tanggal, p.id, e.target.checked)}
        />
        <label
          htmlFor={`hadir-${p.id}`}
          className="flex-1 cursor-pointer truncate text-sm font-semibold text-slate-800"
        >
          {p.nama}
        </label>
        {r.hadir ? (
          <span className="text-xs text-slate-500">
            Uang kue <b className="tabular-nums text-slate-800">{rp(r.total)}</b>
          </span>
        ) : (
          <span className="text-xs text-slate-400">Tidak nitip</span>
        )}
        {r.saldo !== null && r.saldo !== 0 && (
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ${
              r.saldo < 0 ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"
            }`}
          >
            {r.saldo < 0 ? "Kurang " : "Lebih "}
            {rp(Math.abs(r.saldo))}
          </span>
        )}
      </div>

      {r.hadir && (
        <div className="overflow-x-auto border-t border-slate-100 px-3 pt-2 pb-3 sm:px-4">
          {p.kue.length === 0 ? (
            <p className="py-2 text-sm text-slate-500">
              Belum ada kue untuk penitip ini. Tambahkan di tab Data Master.
            </p>
          ) : (
            <table
              style={{ ...tabel, fontFamily: KELUARGA_HURUF[s.pdfFamily] ?? KELUARGA_HURUF.helvetica }}
            >
              <thead>
                <tr>
                  {kolom.map(({ kunci, judul }, i) => (
                    <th
                      key={kunci}
                      style={{ ...gayaCss(gh, gk[i].rata), ...sel, ...(gk[i].lebar > 0 ? { width: Math.round(gk[i].lebar * 3.78) } : {}) }}
                    >
                      {judul}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {p.kue.map((k) => {
                  const c = entri?.kue?.[k.id];
                  const b = r.baris.find((x) => x.id === k.id);
                  const isi: Record<string, React.ReactNode> = {
                    kolKue: k.nama,
                    kolJumlah: (
                      <input
                        type="number"
                        min={0}
                        inputMode="numeric"
                        aria-label={`Jumlah ${k.nama} untuk ${p.nama}`}
                        className="w-full min-w-11 rounded-md border border-slate-300 bg-white px-1.5 py-1 text-right tabular-nums"
                        style={{ fontSize: "inherit", color: "inherit" }}
                        value={c?.nitip ?? ""}
                        onChange={(e) => aksi.setNilaiKue(tanggal, p.id, k.id, "nitip", keAngka(e.target.value))}
                      />
                    ),
                    kolSisa: (
                      <input
                        type="number"
                        min={0}
                        inputMode="numeric"
                        aria-label={`Sisa ${k.nama} untuk ${p.nama}`}
                        className="w-full min-w-11 rounded-md border border-slate-300 bg-white px-1.5 py-1 text-right tabular-nums"
                        style={{ fontSize: "inherit", color: "inherit" }}
                        value={c?.sisa ?? ""}
                        onChange={(e) => aksi.setNilaiKue(tanggal, p.id, k.id, "sisa", keAngka(e.target.value))}
                      />
                    ),
                    kolLaku: b && b.siap ? b.laku : "-",
                    kolHarga: rp(k.setor),
                    kolUang: b && b.siap ? rp(b.uang) : "-",
                  };
                  return (
                    <tr key={k.id}>
                      {kolom.map(({ kunci }, i) => (
                        <td key={kunci} style={{ ...gayaCss(gk[i]), ...sel }}>
                          {isi[kunci]}
                        </td>
                      ))}
                    </tr>
                  );
                })}

                <Baris kunci="rBrt" label={s.pdfBrt} nilai={rp(r.total)} />
                {r.sebelum !== 0 && (
                  <>
                    <Baris
                      kunci={r.sebelum < 0 ? "rTbh" : "rPtg"}
                      label={labelSebelum(r.sebelum, r.tglSebelum, s)}
                      nilai={rp(Math.abs(r.sebelum))}
                    />
                    <Baris kunci="rTotal" label={s.pdfTotal} nilai={rp(r.harus)} />
                  </>
                )}
                <Baris kunci="rDiterima" label={s.pdfDiterima}>
                  <input
                    type="number"
                    min={0}
                    inputMode="numeric"
                    placeholder="uang fisik"
                    aria-label={`Uang fisik dari ${p.nama}`}
                    className="w-full min-w-20 rounded-md border border-slate-300 bg-white px-1.5 py-1 text-right tabular-nums"
                    style={{ fontSize: "inherit", color: "inherit" }}
                    value={entri?.fisik ?? ""}
                    onChange={(e) => aksi.setFisik(tanggal, p.id, keAngka(e.target.value))}
                  />
                </Baris>
                {r.saldo !== null && r.saldo !== 0 && (
                  <Baris
                    kunci={r.saldo < 0 ? "rKurang" : "rLebih"}
                    label={r.saldo < 0 ? s.kurang : s.lebih}
                    nilai={rp(Math.abs(r.saldo))}
                  />
                )}
              </tbody>
            </table>
          )}

          {r.sebelum !== 0 && r.tglSebelum && (
            <p className="mt-2 text-[11px] text-slate-500">
              Saldo hari lalu diambil dari catatan {labelTgl(r.tglSebelum)}.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
