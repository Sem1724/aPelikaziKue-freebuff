import type { Metadata, Viewport } from "next";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = {
  title: "Catatan Titipan Kue",
  description:
    "Catatan titipan kue harian: nitip, sisa, uang fisik, laporan WhatsApp/PDF, saldo gantungan, dan rekap periode.",
};

export const viewport: Viewport = {
  themeColor: "#0f766e",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>
        <StoreProvider>
          <AppShell>{children}</AppShell>
        </StoreProvider>
      </body>
    </html>
  );
}
