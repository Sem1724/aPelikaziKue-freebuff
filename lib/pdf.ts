import type { jsPDF as JsPDF } from "jspdf";
import type { RowInput, Styles } from "jspdf-autotable";
import type { DB, Gaya, Penitip, Settings } from "./types";
import type { Konteks, RekapPeriode } from "./calc";
import { ringkas } from "./calc";
import { batas, namaTanggal, rp } from "./format";
import { gaya, hexKeRgb, RATA_JS } from "./gaya";
import { barisHariRekap, barisPeriodeRekap, judulRekap } from "./report";

/**
 * Pembuat PDF. jsPDF diimpor secara dinamis supaya tidak membebani halaman
 * yang tidak sedang mengunduh PDF. Semua gaya diambil dari pengaturan laporan.
 */

function selGaya(g: Gaya): Partial<Styles> {
  return {
    textColor: hexKeRgb(g.warna),
    fillColor: hexKeRgb(g.latar),
    halign: RATA_JS[g.rata],
    fontSize: g.ukuran,
    fontStyle: g.tebal ? (g.miring ? "bolditalic" : "bold") : g.miring ? "italic" : "normal",
  };
}

function akhirTabel(doc: JsPDF, cadangan: number): number {
  // jspdf-autotable v5 menaruh hasil tabel terakhir di doc.lastAutoTable
  const d = doc as unknown as { lastAutoTable?: { finalY: number } };
  return d.lastAutoTable?.finalY ?? cadangan;
}

/** Tulis satu baris teks bebas (judul, tanggal, catatan) lalu kembalikan posisi y baru. */
function tulisTeks(
  doc: JsPDF,
  isi: string,
  g: Gaya,
  s: Settings,
  lebar: number,
  y: number,
): number {
  if (!isi) return y;
  const ukuran = g.ukuran;
  const x = g.rata === "tengah" ? lebar / 2 : g.rata === "kanan" ? lebar - 8 : 8;
  const w = hexKeRgb(g.warna);
  doc.setFont(s.pdfFamily, (selGaya(g).fontStyle ?? "normal") as "normal" | "bold" | "italic" | "bolditalic");
  doc.setFontSize(ukuran);
  doc.setTextColor(w[0], w[1], w[2]);
  const posisi = y + ukuran * 0.36;
  doc.text(String(isi), x, posisi, { align: RATA_JS[g.rata] });
  return posisi + ukuran * 0.1 + 1.5;
}

type OpsiTabel = Parameters<typeof import("jspdf-autotable").default>[1];

function opsiUmum(s: Settings): OpsiTabel {
  return {
    margin: { left: 8, right: 8, bottom: 0 },
    theme: "grid",
    styles: {
      font: s.pdfFamily,
      cellPadding: batas(s.pdfPadding, 0, 5, 1.2),
      lineColor: hexKeRgb(s.pdfWarnaGaris),
      lineWidth: s.pdfTema === "plain" ? 0 : batas(s.pdfTebalGaris, 0.05, 1, 0.1),
    },
  };
}

/** PDF laporan harian: satu halaman setinggi isi, tanpa harga jual dan tanpa untung. */
export async function buatPdfLaporan(
  db: DB,
  ctx: Konteks,
  s: Settings,
  tgl: string,
): Promise<JsPDF> {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const lebar = batas(s.pdfLebar, 60, 210, 110);
  const jarak = batas(s.pdfJarak, 0, 20, 5);
  const kolom = [
    ["kolKue", s.pdfKue],
    ["kolJumlah", s.pdfJumlah],
    ["kolSisa", s.pdfSisa],
    ["kolLaku", s.pdfLaku],
    ["kolHarga", s.pdfHarga],
    ["kolUang", s.pdfUang],
  ].filter(([k]) => gaya(s, k).tampil !== false) as [string, string][];
  const n = kolom.length;
  const gk = kolom.map(([k]) => gaya(s, k));

  const gambar = (doc: JsPDF): number => {
    let y = 6;
    y = tulisTeks(doc, s.judul, gaya(s, "judul"), s, lebar, y);
    if (gaya(s, "tanggal").tampil !== false) {
      y = tulisTeks(doc, namaTanggal(tgl), gaya(s, "tanggal"), s, lebar, y);
    }
    y += 2;

    db.penitip.forEach((p) => {
      const r = ringkas(db, ctx, tgl, p);
      if (!r.hadir || !r.baris.length || !n) return;

      const body: RowInput[] = r.baris.map((b) =>
        kolom.map(([k], i) => ({
          content: String(
            k === "kolKue"
              ? b.nama
              : k === "kolJumlah"
                ? b.nitip
                : k === "kolSisa"
                  ? b.siap
                    ? (b.sisa ?? "")
                    : "?"
                  : k === "kolLaku"
                    ? b.laku
                    : k === "kolHarga"
                      ? rp(b.setor)
                      : rp(b.uang),
          ),
          styles: selGaya(gk[i]),
        })),
      );

      const barisRingkas = (kunci: string, label: string, nilai: string) => {
        const g = gaya(s, kunci);
        if (g.tampil === false) return;
        body.push([
          { content: label, colSpan: Math.max(1, n - 1), styles: selGaya(g) },
          { content: nilai, styles: { ...selGaya(g), halign: RATA_JS[g.rataNilai] } },
        ]);
      };

      barisRingkas("rBrt", s.pdfBrt, rp(r.total));
      if (r.sebelum !== 0) {
        barisRingkas(r.sebelum < 0 ? "rTbh" : "rPtg", labelSaldoLalu(s, r.sebelum, r.tglSebelum), rp(Math.abs(r.sebelum)));
        barisRingkas("rTotal", s.pdfTotal, rp(r.harus));
      }
      if (r.fisik !== null) {
        barisRingkas("rDiterima", s.pdfDiterima, rp(r.fisik));
        if (r.saldo !== null && r.saldo !== 0) {
          barisRingkas(r.saldo < 0 ? "rKurang" : "rLebih", r.saldo < 0 ? s.kurang : s.lebih, rp(Math.abs(r.saldo)));
        }
      }

      const gh = gaya(s, "kepala");
      const gn = gaya(s, "nama");
      const kepala = kolom.map(([, judul], i) => ({
        content: judul,
        styles: { ...selGaya(gh), halign: RATA_JS[gk[i].rata] },
      }));
      const lebarKolom: Record<number, { cellWidth: number }> = {};
      gk.forEach((g, i) => {
        if (g.lebar > 0) lebarKolom[i] = { cellWidth: g.lebar };
      });

      autoTable(doc, {
        ...opsiUmum(s),
        startY: y,
        columnStyles: lebarKolom,
        head: [
          [{ content: gn.besar ? p.nama.toUpperCase() : p.nama, colSpan: n, styles: selGaya(gn) }],
          kepala,
        ],
        body,
      });
      y = akhirTabel(doc, y) + jarak;
    });

    if (s.pdfCatatan) {
      y = tulisTeks(doc, s.pdfCatatan, gaya(s, "catatan"), s, lebar, y + 2);
    }
    return y;
  };

  // Ukur tinggi isi pada halaman sangat tinggi, lalu buat halaman final seukuran isi.
  const pengukur = new jsPDF({ unit: "mm", format: [lebar, 5000] });
  const tinggi = Math.max(gambar(pengukur) + 10, 60);
  const doc = new jsPDF({
    unit: "mm",
    format: [lebar, tinggi],
    orientation: tinggi > lebar ? "portrait" : "landscape",
  });
  gambar(doc);
  return doc;
}

function labelSaldoLalu(s: Settings, saldo: number, tgl: string | null): string {
  const nama = saldo < 0 ? s.tbh : s.ptg;
  return tgl ? `${nama} (${labelTglPdf(tgl)})` : nama;
}

function labelTglPdf(tgl: string): string {
  const [y, b, h] = tgl.split("-");
  return `${h}/${b}/${y}`;
}

/** PDF rekap satu periode: rincian tiap hari + ringkasan periode. */
export async function buatPdfRekap(
  db: DB,
  ctx: Konteks,
  s: Settings,
  it: RekapPeriode,
  p: Penitip,
): Promise<JsPDF> {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const lebar = batas(s.pdfLebar, 60, 210, 110);
  const kunciKolom = ["kolTanggal", "kolKue", "kolJumlah", "kolSisa", "kolLaku", "kolUang"];
  const gk = kunciKolom.map((k) => gaya(s, k));

  const gambar = (doc: JsPDF): number => {
    const body: RowInput[] = [];

    it.rinci.forEach((x) => {
      x.r.baris.forEach((b) => {
        body.push(
          [labelTglPdf(x.tgl), b.nama, String(b.nitip), b.siap ? String(b.sisa ?? "") : "?", String(b.laku), rp(b.uang)].map(
            (isi, i) => ({ content: isi, styles: selGaya(gk[i]) }),
          ),
        );
      });
      barisHariRekap(x.r, s).forEach((b) => {
        const g = gaya(s, b.kunci);
        if (g.tampil === false) return;
        body.push([
          { content: b.teksPdf, colSpan: 5, styles: selGaya(g) },
          { content: b.nilai, styles: { ...selGaya(g), halign: RATA_JS[g.rataNilai] } },
        ]);
      });
    });

    barisPeriodeRekap(it, s).forEach((b) => {
      const g = gaya(s, b.kunci);
      if (g.tampil === false) return;
      body.push([
        { content: b.teksPdf, colSpan: 5, styles: selGaya(g) },
        { content: b.nilai, styles: { ...selGaya(g), halign: RATA_JS[g.rataNilai] } },
      ]);
    });

    const gh = gaya(s, "kepala");
    const kepala = [s.rkTanggal, s.pdfKue, s.pdfJumlah, s.pdfSisa, s.pdfLaku, s.pdfUang].map((judul, i) => ({
      content: judul,
      styles: { ...selGaya(gh), halign: RATA_JS[gk[i].rata] },
    }));

    const lebarKolom: Record<number, { cellWidth: number }> = {};
    gk.forEach((g, i) => {
      if (g.lebar > 0) lebarKolom[i] = { cellWidth: g.lebar };
    });

    autoTable(doc, {
      ...opsiUmum(s),
      startY: 6,
      columnStyles: lebarKolom,
      head: [[{ content: judulRekap(it, p, s), colSpan: 6, styles: selGaya(gaya(s, "nama")) }], kepala],
      body,
    });

    let y = akhirTabel(doc, 6);
    if (s.pdfCatatan) {
      y = tulisTeks(doc, s.pdfCatatan, gaya(s, "catatan"), s, lebar, y + 2);
    }
    return y;
  };

  const pengukur = new jsPDF({ unit: "mm", format: [lebar, 5000] });
  const tinggi = Math.max(gambar(pengukur) + 10, 60);
  const doc = new jsPDF({
    unit: "mm",
    format: [lebar, tinggi],
    orientation: tinggi > lebar ? "portrait" : "landscape",
  });
  gambar(doc);
  return doc;
}

export function simpanPdf(doc: JsPDF, nama: string): void {
  doc.save(nama);
}

export function tautanPdf(doc: JsPDF): string {
  return URL.createObjectURL(doc.output("blob"));
}
