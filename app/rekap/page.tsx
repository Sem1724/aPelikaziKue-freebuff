"use client";

import Link from "next/link";
import { Fragment, useEffect, useMemo, useState } from "react";
import { riwayatRekap, rentangRekap } from "@/lib/calc";
import { salinTeks } from "@/lib/clipboard";
import { labelTgl, rp } from "@/lib/format";
import { buatPdfRekap, tautanPdf } from "@/lib/pdf";
import { barisHariRekap, barisPeriodeRekap, buatTeksRekap, judulRekap } from "@/lib/report";
import { useStore } from "@/lib/store";
import { PengaturanLaporan } from "@/components/pengaturan-laporan";
import { IkonPdf, IkonSalin } from "@/components/icons";

export default function HalamanRekap() {
  const { db, konteks, aksi } = useStore();
  const daftar = db.penitip.filter((p) => p.rekap);

  const [pid, setPid] = useState("");
  const [lihat, setLihat] = useState<number | null>(null);
  const [info, setInfo] = useState("");
  const [sibuk, setSibuk] = useState(false);

  const p = daftar.find((x) => x.id === pid) ?? daftar[0] ?? null;
  const riw = useMemo(() => (p ? riwayatRekap(db, konteks, p) : []), [db, konteks, p]);
  const akhirIdx = riw.length - 1;
  const idx = lihat === null || lihat > akhirIdx ? akhirIdx : Math.max(0, lihat);
  const it = riw[idx];
  const berjalan = idx === akhirIdx;

  const tglTerakhir = it?.rinci[it.rinci.length - 1]?.tgl ?? "";
  const [sampai, setSampai] = useState(tglTerakhir);

  useEffect(() => {
    setLihat(null);
  }, [pid]);

  useEffect(() => {
    setSampai(tglTerakhir);
  }, [tglTerakhir, idx]);

  if (!p) {
    return (
      <div className="card px-6 py-10 text-center">
        <p className="font-medium text-slate-700">Belum ada penitip yang dibayar per periode.</p>
        <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
          Centang “Dibayar per periode” pada penitipnya di Data Master. Uang fisik tetap diisi tiap
          hari di Input Harian seperti biasa.
        </p>
        <Link href="/master" className="btn btn-primary mt-4">
          Buka Data Master
        </Link>
      </div>
    );
  }

  if (!it) return null;

  const s = db.pengaturanRekap;
  const teks = buatTeksRekap(it, p, s);

  const tutup = () => {
    if (!sampai) return setInfo("Pilih tanggal terakhir yang ikut periode ini.");
    const sebelumnya = riw.length > 1 ? riw[riw.length - 2].sampai : null;
    if (sebelumnya && sampai <= sebelumnya) {
      return setInfo(`Tanggalnya harus setelah penutupan sebelumnya (${labelTgl(sebelumnya)}).`);
    }
    if (!it.rinci.some((x) => x.tgl <= sampai)) {
      return setInfo("Belum ada catatan sampai tanggal itu.");
    }
    if (db.periode[p.id]?.some((x) => x.sampai === sampai)) {
      return setInfo("Periode dengan tanggal itu sudah ditutup.");
    }
    if (!window.confirm(`Tutup periode sampai ${labelTgl(sampai)}?`)) return;
    aksi.tutupPeriode(p.id, sampai);
    setInfo("Periode ditutup. Kurang atau lebih terakhir dibawa ke periode berikutnya.");
  };

  const salin = async () => {
    const ok = await salinTeks(teks);
    setInfo(ok ? "Rekap tersalin. Tempel di grup WhatsApp." : "Gagal menyalin, coba lagi.");
  };

  const pdf = async (mode: "unduh" | "pratinjau") => {
    setSibuk(true);
    setInfo("");
    try {
      const doc = await buatPdfRekap(db, konteks, s, it, p);
      if (mode === "unduh") {
        doc.save(`Rekap-${p.nama.replace(/\s+/g, "-")}-${it.sampai ?? "berjalan"}.pdf`);
        setInfo("PDF rekap diunduh.");
      } else {
        window.open(tautanPdf(doc), "_blank", "noopener");
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
      <div className="card px-4 py-3">
        <label className="block max-w-xs">
          <span className="label">Penitip</span>
          <select className="input" value={p.id} onChange={(e) => setPid(e.target.value)}>
            {daftar.map((x) => (
              <option key={x.id} value={x.id}>
                {x.nama}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        {riw.map((x, i) => (
          <button
            key={x.sampai ?? "berjalan"}
            type="button"
            className={`btn btn-sm ${i === idx ? "btn-primary" : "btn-secondary"}`}
            onClick={() => {
              setLihat(i);
              setInfo("");
            }}
          >
            {i === akhirIdx ? "Berjalan" : `Periode ${i + 1}`}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-baseline justify-between gap-1 border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">{judulRekap(it, p, s)}</h2>
          <span className="text-xs text-slate-500">
            {berjalan ? "Periode berjalan" : `Periode ${idx + 1}`} · {rentangRekap(it)}
          </span>
        </div>

        {it.kosong.length > 0 && (
          <div className="border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900">
            Uang fisik (masuk kotak) belum diisi pada: {it.kosong.map(labelTgl).join(", ")}.
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="table-data min-w-full">
            <thead>
              <tr>
                <th>{s.rkTanggal}</th>
                <th>{s.pdfKue}</th>
                <th>{s.pdfJumlah}</th>
                <th>{s.pdfSisa}</th>
                <th>{s.pdfLaku}</th>
                <th>{s.pdfUang}</th>
              </tr>
            </thead>
            <tbody>
              {it.rinci.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-slate-500">
                    Belum ada catatan pada periode ini.
                  </td>
                </tr>
              ) : (
                it.rinci.map((x) => (
                  <Fragment key={x.tgl}>
                    {x.r.baris.map((k) => (
                      <tr key={`${x.tgl}-${k.id}`}>
                        <td>{labelTgl(x.tgl)}</td>
                        <td>{k.nama}</td>
                        <td>{k.nitip}</td>
                        <td>{k.siap ? k.sisa : "?"}</td>
                        <td>{k.laku}</td>
                        <td>{rp(k.uang)}</td>
                      </tr>
                    ))}
                    {barisHariRekap(x.r, s).map((b) => (
                      <tr key={`${x.tgl}-${b.kunci}`} className="bg-slate-50/70">
                        <td colSpan={5} className="text-slate-600 italic">
                          {b.teksLayar}
                        </td>
                        <td className={b.nada === "minus" ? "text-red-700" : b.nada === "plus" ? "text-emerald-700" : ""}>
                          {b.nilai}
                        </td>
                      </tr>
                    ))}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <section className="card overflow-hidden">
        <h2 className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-800">
          Ringkasan periode
        </h2>
        <table className="table-data min-w-full">
          <tbody>
            {barisPeriodeRekap(it, s).map((b) => (
              <tr key={b.kunci}>
                <td>{b.teksLayar}</td>
                <td className={b.nada === "minus" ? "text-red-700" : b.nada === "plus" ? "text-emerald-700" : ""}>
                  {b.nilai}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {berjalan ? (
        <div className="card px-4 py-3">
          <p className="text-sm font-semibold text-slate-800">Tutup periode</p>
          <p className="mt-0.5 text-xs text-slate-500">
            Dipakai saat penitip mengambil semua kotaknya. Kurang atau lebih terakhir otomatis dibawa
            ke periode berikutnya.
          </p>
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <label className="block">
              <span className="label">Tanggal terakhir periode ini</span>
              <input type="date" className="input w-auto" value={sampai} onChange={(e) => setSampai(e.target.value)} />
            </label>
            <button type="button" className="btn btn-primary" onClick={tutup}>
              Tutup periode
            </button>
          </div>
        </div>
      ) : idx === akhirIdx - 1 ? (
        <div className="card px-4 py-3">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              aksi.batalTutupPeriode(p.id);
              setInfo("Penutupan terakhir dibatalkan.");
            }}
          >
            Batalkan penutupan periode ini
          </button>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="btn btn-primary" onClick={salin}>
          <IkonSalin width={16} height={16} /> Salin rekap
        </button>
        <button type="button" className="btn btn-secondary" disabled={sibuk} onClick={() => pdf("unduh")}>
          <IkonPdf width={16} height={16} /> {sibuk ? "Membuat…" : "Unduh PDF rekap"}
        </button>
        <button type="button" className="btn btn-ghost" disabled={sibuk} onClick={() => pdf("pratinjau")}>
          Pratinjau PDF
        </button>
        {info && (
          <span className="text-sm text-slate-600" role="status">
            {info}
          </span>
        )}
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-slate-700">Pengaturan tampilan rekap</h2>
        <PengaturanLaporan profil="rekap" />
      </div>
    </div>
  );
}
