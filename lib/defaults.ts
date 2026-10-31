import type { Gaya, GayaPeta, KueMaster, Penitip, Settings } from "./types";

/** Data awal 19 penitip. Format: [nama penitip, [[nama kue, harga setor], ...]] */
export const DATA_AWAL: [string, [string, number][]][] = [
  ["Griya", [["Kue - kue", 1000]]],
  ["Cilok", [["Cilok Tusuk", 800], ["Cilok Bungkus", 4000]]],
  ["Madonat", [["Donat", 1000]]],
  ["Dimsum", [["Dimsum", 4500]]],
  ["Mayo", [["Mayo", 1700]]],
  ["NM Gs. Alm", [["Apem", 1700], ["Talam", 1700]]],
  ["NM Griya", [["Talam", 1700]]],
  ["Nopal", [["Kue - kue", 1700], ["Gabin", 2000], ["Pesenan", 1700]]],
  [
    "Mba dewi",
    [
      ["Kebab", 2000],
      ["Salad Jelly", 6000],
      ["Pastel sayur (Plstk)", 1700],
      ["Pastel Bihun", 1200],
    ],
  ],
  ["Tasya", [["Puding", 1700], ["Ketan sundeng", 1700]]],
  [
    "Budiana",
    [
      ["Kue sus (Besar)", 1700],
      ["Kue sus (Kecil)", 1200],
      ["Bolu ketan hitam", 1700],
      ["Bolu pisang", 1700],
      ["Lapis (Plastik)", 1000],
      ["Lapis (Mika)", 1700],
      ["Bolu karamel", 2000],
      ["Wingko", 2000],
      ["Cake singkong", 1700],
      ["Bolu Jadul", 1700],
      ["Ongol ongol", 1700],
      ["Ubi Ungu", 1700],
    ],
  ],
  ["Bude", [["Kue - kue", 1000], ["SS", 1700], ["Risol", 1000], ["Mendut + Lemper", 1700]]],
  [
    "Bu Yanti",
    [
      ["Lopis", 5000],
      ["Arem", 1700],
      ["Sosis solo", 1700],
      ["Wajik", 1700],
      ["Krekes", 1700],
      ["Bugis mandi", 1700],
      ["Martabak", 1000],
      ["Apem", 1000],
      ["Pastel", 1700],
      ["Risol", 1700],
      ["Lemper", 1700],
    ],
  ],
  ["Donat seres", [["Donat", 800]]],
  ["Mm Nurul", [["Lapis (Grs kcl)", 1700]]],
  ["Sosis solo", [["Sosis solo", 1700]]],
  ["Onde", [["Onde", 1000]]],
  ["Mba ciken", [["Bubur sumsum", 4500], ["Cang ijo", 4500], ["Timus", 1000]]],
  ["Mochi", [["Mochi (pesanan)", 4500], ["Mochi (Nitip)", 4500]]],
];

export const DEF_PENGATURAN: Settings = {
  judul: "Dari YULI",

  pdfKue: "Kue",
  pdfJumlah: "Jumlah",
  pdfSisa: "Sisa",
  pdfLaku: "Laku",
  pdfHarga: "Harga",
  pdfUang: "Uang",
  pdfBrt: "Brt",
  pdfTotal: "Total",
  pdfDiterima: "Diterima",

  waNitip: "nitip",
  waSisa: "sisa",
  waLaku: "laku",
  waTotal: "Total",
  waHarus: "Harus disetor",
  waDiterima: "Uang diterima",

  kurang: "Kurang",
  lebih: "Lebih",
  tbh: "Tbh",
  ptg: "Ptg",

  pdfFamily: "helvetica",
  pdfLebar: 110,
  pdfTema: "grid",
  pdfWarnaGaris: "#0a0a0a",
  pdfTebalGaris: 0.1,
  pdfJarak: 5,
  pdfPadding: 1.2,
  pdfCatatan: "",

  rkJudul: "Rekap {nama} ({periode})",
  rkTanggal: "Tanggal",
  rkLaku: "Total laku",
  rkPeriode: "Total periode",
  rkKotak: "Total di kotak",
  rkKurangAkhir: "Kurang (ke periode berikutnya)",
  rkLebihAkhir: "Lebih (ke periode berikutnya)",
};

const T = (warna: string, ubah: Partial<Gaya> = {}): Gaya => ({
  warna,
  latar: "#ffffff",
  tebal: false,
  miring: false,
  rata: "kiri",
  rataNilai: "kanan",
  ukuran: 8,
  tampil: true,
  besar: false,
  lebar: 0,
  ...ubah,
});

/** Gaya bawaan tiap bagian laporan. */
export const GAYA_DEF: Record<string, Gaya> = {
  judul: T("#000000", { ukuran: 13 }),
  tanggal: T("#000000", { ukuran: 9 }),
  nama: T("#ffffff", { latar: "#0f766e", tebal: true }),
  kepala: T("#1e1e1e", { latar: "#e6f2f0", tebal: true }),
  kolTanggal: T("#141414"),
  kolKue: T("#141414"),
  kolJumlah: T("#141414", { rata: "kanan" }),
  kolSisa: T("#141414", { rata: "kanan" }),
  kolLaku: T("#141414", { rata: "kanan" }),
  kolHarga: T("#141414", { rata: "kanan" }),
  kolUang: T("#141414", { rata: "kanan" }),
  rBrt: T("#1d4ed8", { tebal: true, rata: "kanan" }),
  rTbh: T("#141414", { rata: "kanan" }),
  rPtg: T("#141414", { rata: "kanan" }),
  rTotal: T("#1d4ed8", { tebal: true, rata: "kanan" }),
  rDiterima: T("#141414", { rata: "kanan" }),
  rKurang: T("#15803d", { tebal: true, rata: "kanan" }),
  rLebih: T("#b91c1c", { tebal: true, rata: "kanan" }),
  // Ringkasan periode (khusus tab Rekap)
  pLaku: T("#141414", { rata: "kanan" }),
  pPeriode: T("#1d4ed8", { tebal: true, rata: "kanan" }),
  pAwalTbh: T("#141414", { rata: "kanan" }),
  pAwalPtg: T("#141414", { rata: "kanan" }),
  pKotak: T("#1d4ed8", { tebal: true, rata: "kanan" }),
  pAkhirKurang: T("#15803d", { tebal: true, rata: "kanan" }),
  pAkhirLebih: T("#b91c1c", { tebal: true, rata: "kanan" }),
  catatan: T("#000000", { miring: true }),
};

/** Kunci gaya yang boleh diatur dari UI, dikelompokkan. */
export type ElemenGaya = {
  kunci: string;
  nama: string;
  pilihan: (keyof Gaya)[];
};

const SEMUA: (keyof Gaya)[] = [
  "warna",
  "latar",
  "tebal",
  "miring",
  "rata",
  "rataNilai",
  "ukuran",
];
const KOL: (keyof Gaya)[] = ["warna", "latar", "tebal", "miring", "rata", "ukuran", "lebar"];
const BARIS: (keyof Gaya)[] = ["tampil", ...SEMUA];

export const ELEMEN_HARIAN: ElemenGaya[] = [
  { kunci: "judul", nama: "Judul laporan", pilihan: ["warna", "tebal", "miring", "rata", "ukuran"] },
  {
    kunci: "tanggal",
    nama: "Tanggal di bawah judul",
    pilihan: ["tampil", "warna", "tebal", "miring", "rata", "ukuran"],
  },
  {
    kunci: "nama",
    nama: "Baris nama penitip",
    pilihan: ["warna", "latar", "tebal", "miring", "rata", "ukuran", "besar"],
  },
  {
    kunci: "kepala",
    nama: "Baris judul kolom",
    pilihan: ["warna", "latar", "tebal", "miring", "ukuran"],
  },
  { kunci: "kolKue", nama: "Kolom kue", pilihan: KOL },
  { kunci: "kolJumlah", nama: "Kolom jumlah titipan", pilihan: KOL },
  { kunci: "kolSisa", nama: "Kolom sisa", pilihan: KOL },
  { kunci: "kolLaku", nama: "Kolom laku", pilihan: KOL },
  { kunci: "kolHarga", nama: "Kolom harga", pilihan: ["tampil", ...KOL] },
  { kunci: "kolUang", nama: "Kolom uang", pilihan: KOL },
  { kunci: "rBrt", nama: "Baris jumlah uang kue", pilihan: BARIS },
  { kunci: "rTbh", nama: "Baris kekurangan hari lalu (Tbh)", pilihan: BARIS },
  { kunci: "rPtg", nama: "Baris potongan hari lalu (Ptg)", pilihan: BARIS },
  { kunci: "rTotal", nama: "Baris total setelah saldo", pilihan: BARIS },
  { kunci: "rDiterima", nama: "Baris uang diterima", pilihan: BARIS },
  { kunci: "rKurang", nama: "Baris kurang", pilihan: BARIS },
  { kunci: "rLebih", nama: "Baris lebih", pilihan: BARIS },
  { kunci: "catatan", nama: "Catatan di bagian bawah", pilihan: ["warna", "tebal", "miring", "rata", "ukuran"] },
];

export const ELEMEN_REKAP: ElemenGaya[] = [
  { kunci: "nama", nama: "Baris judul rekap", pilihan: ["warna", "latar", "tebal", "miring", "rata", "ukuran"] },
  {
    kunci: "kepala",
    nama: "Baris judul kolom",
    pilihan: ["warna", "latar", "tebal", "miring", "ukuran"],
  },
  { kunci: "kolTanggal", nama: "Kolom tanggal", pilihan: KOL },
  { kunci: "kolKue", nama: "Kolom kue", pilihan: KOL },
  { kunci: "kolJumlah", nama: "Kolom jumlah titipan", pilihan: KOL },
  { kunci: "kolSisa", nama: "Kolom sisa", pilihan: KOL },
  { kunci: "kolLaku", nama: "Kolom laku", pilihan: KOL },
  { kunci: "kolUang", nama: "Kolom uang", pilihan: KOL },
  { kunci: "rBrt", nama: "Baris total uang kue (tiap hari)", pilihan: BARIS },
  { kunci: "rTbh", nama: "Baris kekurangan hari lalu (tiap hari)", pilihan: BARIS },
  { kunci: "rPtg", nama: "Baris potongan hari lalu (tiap hari)", pilihan: BARIS },
  { kunci: "rTotal", nama: "Baris total setelah saldo (tiap hari)", pilihan: BARIS },
  { kunci: "rDiterima", nama: "Baris uang diterima (tiap hari)", pilihan: BARIS },
  { kunci: "rKurang", nama: "Baris kurang (tiap hari)", pilihan: BARIS },
  { kunci: "rLebih", nama: "Baris lebih (tiap hari)", pilihan: BARIS },
  { kunci: "pLaku", nama: "Ringkasan: total laku", pilihan: BARIS },
  { kunci: "pPeriode", nama: "Ringkasan: total periode", pilihan: BARIS },
  { kunci: "pAwalTbh", nama: "Ringkasan: saldo awal kekurangan", pilihan: BARIS },
  { kunci: "pAwalPtg", nama: "Ringkasan: saldo awal potongan", pilihan: BARIS },
  { kunci: "pKotak", nama: "Ringkasan: total uang di kotak", pilihan: BARIS },
  { kunci: "pAkhirKurang", nama: "Ringkasan: kurang di akhir periode", pilihan: BARIS },
  { kunci: "pAkhirLebih", nama: "Ringkasan: lebih di akhir periode", pilihan: BARIS },
  { kunci: "catatan", nama: "Catatan di bagian bawah", pilihan: ["warna", "tebal", "miring", "rata", "ukuran"] },
];

export function penitipBaru(): Penitip {
  const id = buatId();
  const kue: KueMaster = { id: buatId(), nama: "Kue baru", setor: 1700, jual: 0 };
  return { id, nama: "Penitip baru", kue: [kue] };
}

export function buatId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().slice(0, 13).replace(/-/g, "");
  }
  return Math.random().toString(36).slice(2, 11);
}

/** Salin pengaturan harian menjadi pengaturan rekap (dipakai pertama kali). */
export function klonRekap(harian: Settings): Settings {
  const salin: Settings = JSON.parse(JSON.stringify(harian));
  const gaya: GayaPeta = (salin.gaya = salin.gaya || {});
  const pasangan: [string, string][] = [
    ["rBrt", "pPeriode"],
    ["rTbh", "pAwalTbh"],
    ["rSaldo", "pAwalTbh"],
    ["rPtg", "pAwalPtg"],
    ["rSaldo", "pAwalPtg"],
    ["rTotal", "pKotak"],
    ["rKurang", "pAkhirKurang"],
    ["rLebih", "pAkhirLebih"],
    ["kolKue", "kolTanggal"],
  ];
  pasangan.forEach(([dari, ke]) => {
    if (gaya[dari] && !gaya[ke]) gaya[ke] = JSON.parse(JSON.stringify(gaya[dari]));
  });
  return salin;
}
