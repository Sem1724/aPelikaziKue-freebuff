"use client";

import { useMemo, useState } from "react";
import { ringkas } from "@/lib/calc";
import { salinTeks } from "@/lib/clipboard";
import { namaTanggal } from "@/lib/format";
import { buatPdfLaporan, tautanPdf } from "@/lib/pdf";
import { buatTeksLaporan } from "@/lib/report";
import { useStore } from "@/lib/store";
import { PengaturanLaporan } from "@/components/pengaturan-laporan";
import { IkonPdf, IkonSalin, IkonWhatsApp } from "@/components/icons";

export default function HalamanLaporan() {
  const { db, konteks, tanggal } = useStore();
  const [info, setInfo] = useState("");
  const [sibuk, setSibuk] = useState(false);
  const [pratinjau, setPratinjau] = useState<string | null>(null);

  const teks = useMemo(() => buatTeksLaporan(db, konteks, db.pengaturan, tanggal), [db, konteks, tanggal]);

  const belum = db.penitip
    .filter((p) => ringkas(db, konteks, tanggal, p).baris.some((b) => !b.siap))
    .map((p) => p.nama);

  const salin = async () => {
    const ok = await salinTeks(teks);
    setInfo(ok ? "Laporan tersalin. Tempel di grup WhatsApp." : "Gagal menyalin — pilih teksnya lalu salin manual.");
  };

  const bukaWhatsApp = () => {
    window.open("https://wa.me/?text=" + encodeURIComponent(teks), "_blank", "noopener");
  };

  const buatPdf = async (aksi: "unduh" | "pratinjau") => {
    setSibuk(true);
    setInfo("");
    try {
      const doc = await buatPdfLaporan(db, konteks, db.pengaturan, tanggal);
      if (aksi === "unduh") {
        doc.save(`Laporan-Kue-${tanggal}.pdf`);
        setInfo("PDF diunduh.");
      } else {
        const url = tautanPdf(doc);
        setPratinjau(url);
        window.open(url, "_blank", "noopener");
        setInfo("Pratinjau dibuka di tab baru.");
      }
    } catch (e) {
      setInfo("Gagal membuat PDF: " + (e instanceof Error ? e.message : "tidak diketahui"));
    } finally {
      setSibuk(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Laporan harian</h2>
            <p className="text-xs text-slate-500">{namaTanggal(tanggal)}</p>
          </div>
          <span className="rounded-full bg-teal-50 px-2.5 py-1 text-[11px] font-medium text-teal-800">
            Tanpa harga jual & untung
          </span>
        </div>

        {belum.length > 0 && (
          <div role="status" className="border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900">
            Sisa belum diisi untuk: <b>{belum.join(", ")}</b>. Laporan tetap bisa dibuat, sisa tampil sebagai “?”.
          </div>
        )}

        <div className="p-4">
          <label className="label" htmlFor="teks-laporan">
            Teks untuk grup
          </label>
          <textarea
            id="teks-laporan"
            readOnly
            className="h-80 w-full resize-y rounded-lg border border-slate-300 bg-slate-50 p-3 font-mono text-[13px] leading-relaxed text-slate-800"
            value={teks}
          />

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button type="button" className="btn btn-primary" onClick={salin}>
              <IkonSalin width={16} height={16} /> Salin laporan
            </button>
            <button type="button" className="btn btn-secondary" onClick={bukaWhatsApp}>
              <IkonWhatsApp width={16} height={16} /> Bagikan ke WhatsApp
            </button>
            <button type="button" className="btn btn-secondary" disabled={sibuk} onClick={() => buatPdf("unduh")}>
              <IkonPdf width={16} height={16} /> {sibuk ? "Membuat…" : "Unduh PDF"}
            </button>
            <button type="button" className="btn btn-ghost" disabled={sibuk} onClick={() => buatPdf("pratinjau")}>
              Pratinjau PDF
            </button>
            {pratinjau && (
              <a className="btn btn-ghost" href={pratinjau} target="_blank" rel="noopener noreferrer">
                Buka pratinjau
              </a>
            )}
          </div>
          {info && (
            <p className="mt-2 text-sm text-slate-600" role="status">
              {info}
            </p>
          )}
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-slate-700">Pengaturan laporan harian</h2>
        <PengaturanLaporan profil="harian" />
      </div>
    </div>
  );
}
