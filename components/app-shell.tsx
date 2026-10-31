"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useStore } from "@/lib/store";
import { ukuranTeks } from "@/lib/storage";
import {
  IkonCadangan,
  IkonGantungan,
  IkonInput,
  IkonKue,
  IkonLaporan,
  IkonMaster,
  IkonRekap,
  IkonUntung,
} from "@/components/icons";

export const MENU = [
  { href: "/", label: "Input Harian", keterangan: "Catat titipan dan uang fisik", Ikon: IkonInput },
  { href: "/laporan", label: "Laporan", keterangan: "Teks WhatsApp dan PDF untuk grup", Ikon: IkonLaporan },
  { href: "/keuntungan", label: "Keuntungan", keterangan: "Rekap penjualan dan margin", Ikon: IkonUntung },
  { href: "/gantungan", label: "Gantungan", keterangan: "Saldo kurang atau lebih yang belum selesai", Ikon: IkonGantungan },
  { href: "/rekap", label: "Rekap", keterangan: "Penitip yang dibayar per periode", Ikon: IkonRekap },
  { href: "/master", label: "Data Master", keterangan: "Penitip, kue, dan harga", Ikon: IkonMaster },
  { href: "/cadangan", label: "Cadangan", keterangan: "Cadangan, pulihkan, dan akun", Ikon: IkonCadangan },
];

function NavTautan({ aktif }: { aktif: boolean }) {
  return aktif ? "bg-teal-50 text-teal-800" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900";
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { tanggal, aksi, cloud, galatSimpan, ukuran } = useStore();
  const aktif = MENU.find((m) => m.href === pathname) ?? MENU[0];
  const tampilTanggal = pathname === "/" || pathname === "/laporan";

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[16rem_1fr]">
      <aside className="hidden border-r border-slate-200 bg-white lg:flex lg:flex-col">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-teal-700 text-white">
            <IkonKue width={22} height={22} />
          </span>
          <div>
            <p className="text-sm leading-tight font-semibold">Catatan Titipan</p>
            <p className="text-xs text-slate-500">Kue · kelola harian</p>
          </div>
        </div>
        <nav className="flex-1 space-y-0.5 px-3" aria-label="Menu utama">
          {MENU.map(({ href, label, Ikon }) => {
            const iniAktif = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                aria-current={iniAktif ? "page" : undefined}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${NavTautan({
                  aktif: iniAktif,
                })}`}
              >
                <Ikon />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-slate-200 px-5 py-4 text-[11px] leading-relaxed text-slate-500">
          {cloud.aktif ? "Tersinkron ke akun Anda" : "Data tersimpan di perangkat ini"} · {ukuranTeks(ukuran)}
        </div>
      </aside>

      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 lg:px-6">
            <div className="flex items-center gap-2 lg:hidden">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-teal-700 text-white">
                <IkonKue width={18} height={18} />
              </span>
              <span className="text-sm font-semibold">Catatan Titipan</span>
            </div>
            <div className="hidden lg:block">
              <h1 className="text-base font-semibold text-slate-900">{aktif.label}</h1>
              <p className="text-xs text-slate-500">{aktif.keterangan}</p>
            </div>

            <div className="ml-auto flex items-center gap-2 sm:gap-3">
              {tampilTanggal && (
                <label className="flex items-center gap-2 text-xs font-medium text-slate-500">
                  <span className="hidden sm:inline">Tanggal</span>
                  <input
                    type="date"
                    className="input w-auto px-2 py-1.5 text-sm"
                    value={tanggal}
                    onChange={(e) => aksi.gantiTanggal(e.target.value)}
                    aria-label="Tanggal catatan"
                  />
                </label>
              )}
              {cloud.aktif && (
                <span
                  className="inline-flex max-w-[14rem] items-center gap-1.5 rounded-full border border-slate-200 px-2.5 py-1 text-[11px] text-slate-600"
                  title={cloud.teks}
                >
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${cloud.galat ? "bg-red-500" : "bg-emerald-500"}`}
                  />
                  <span className="hidden truncate sm:inline">{cloud.teks || "Firebase tersambung"}</span>
                </span>
              )}
            </div>
          </div>

          <nav className="flex overflow-x-auto border-t border-slate-200 lg:hidden" aria-label="Menu utama">
            {MENU.map(({ href, label, Ikon }) => {
              const iniAktif = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={iniAktif ? "page" : undefined}
                  className={`flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-xs font-medium whitespace-nowrap ${
                    iniAktif
                      ? "border-teal-700 text-teal-800"
                      : "border-transparent text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Ikon width={15} height={15} />
                  {label}
                </Link>
              );
            })}
          </nav>
        </header>

        {galatSimpan && (
          <div role="alert" className="border-b border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-900">
            <strong className="font-semibold">Penyimpanan bermasalah.</strong> {galatSimpan}
          </div>
        )}

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-5 lg:px-6 lg:py-6">{children}</main>

        <footer className="border-t border-slate-200 px-4 py-4 text-center text-xs text-slate-400 lg:px-6">
          Catatan Titipan Kue · {cloud.aktif ? "data tersinkron ke akun Anda" : "data tersimpan di perangkat ini"} ·{" "}
          <Link href="/cadangan" className="text-slate-500 underline-offset-2 hover:underline">
            unduh cadangan
          </Link>
        </footer>
      </div>
    </div>
  );
}
