/** Tipe data inti aplikasi. Bentuknya sengaja kompatibel dengan cadangan versi lama. */

export type Rata = "kiri" | "tengah" | "kanan";

export type KueMaster = {
  id: string;
  nama: string;
  setor: number;
  jual: number;
};

export type Penitip = {
  id: string;
  nama: string;
  /** true = dibayar per periode (tab Rekap), bukan harian */
  rekap?: boolean;
  kue: KueMaster[];
};

export type KueHari = {
  nama: string;
  nitip: number | "";
  sisa: number | "";
  setor: number;
  jual: number;
};

export type EntriHari = {
  hadir: boolean;
  /** uang fisik yang diterima; "" = belum diisi */
  fisik: number | "";
  kue: Record<string, KueHari>;
};

export type HariMap = Record<string, Record<string, EntriHari>>;

export type Gaya = {
  warna: string;
  latar: string;
  tebal: boolean;
  miring: boolean;
  rata: Rata;
  rataNilai: Rata;
  ukuran: number;
  tampil: boolean;
  besar: boolean;
  lebar: number;
};

export type GayaPeta = Record<string, Partial<Gaya>>;

export type Settings = {
  judul: string;

  pdfKue: string;
  pdfJumlah: string;
  pdfSisa: string;
  pdfLaku: string;
  pdfHarga: string;
  pdfUang: string;
  pdfBrt: string;
  pdfTotal: string;
  pdfDiterima: string;

  waNitip: string;
  waSisa: string;
  waLaku: string;
  waTotal: string;
  waHarus: string;
  waDiterima: string;

  kurang: string;
  lebih: string;
  tbh: string;
  ptg: string;

  pdfFamily: "helvetica" | "times" | "courier";
  pdfLebar: number;
  pdfTema: "grid" | "plain";
  pdfWarnaGaris: string;
  pdfTebalGaris: number;
  pdfJarak: number;
  pdfPadding: number;
  pdfCatatan: string;

  rkJudul: string;
  rkTanggal: string;
  rkLaku: string;
  rkPeriode: string;
  rkKotak: string;
  rkKurangAkhir: string;
  rkLebihAkhir: string;

  gaya?: GayaPeta;
};

export type Profil = "harian" | "rekap";

export type Periode = { sampai: string };

export type DB = {
  /** versi skema untuk migrasi ke depan */
  versi?: number;
  penitip: Penitip[];
  hari: HariMap;
  pengaturan: Settings;
  pengaturanRekap: Settings;
  periode: Record<string, Periode[]>;
};

export type JenisCadangan = "harian" | "pengaturan" | "master" | "semua";
