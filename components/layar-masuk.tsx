"use client";

import { useState } from "react";
import { masukEmail, pesanGalatMasuk } from "@/lib/cloud";
import { IkonKue } from "@/components/icons";

export function LayarMasuk() {
  const [email, setEmail] = useState("");
  const [sandi, setSandi] = useState("");
  const [sibuk, setSibuk] = useState(false);
  const [galat, setGalat] = useState("");

  const kirim = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (sibuk) return;
    setSibuk(true);
    setGalat("");
    try {
      await masukEmail(email, sandi);
    } catch (e) {
      setGalat(pesanGalatMasuk(e));
      setSibuk(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <form onSubmit={kirim} className="card w-full max-w-sm space-y-4 px-5 py-6">
        <div className="flex items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-teal-700 text-white">
            <IkonKue width={22} height={22} />
          </span>
          <div>
            <p className="text-sm leading-tight font-semibold">Catatan Titipan</p>
            <p className="text-xs text-slate-500">Masuk untuk membuka catatan Anda</p>
          </div>
        </div>

        <label className="block">
          <span className="label">Email</span>
          <input
            className="input"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>

        <label className="block">
          <span className="label">Kata sandi</span>
          <input
            className="input"
            type="password"
            autoComplete="current-password"
            required
            value={sandi}
            onChange={(e) => setSandi(e.target.value)}
          />
        </label>

        {galat && (
          <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {galat}
          </p>
        )}

        <button type="submit" className="btn btn-primary w-full" disabled={sibuk}>
          {sibuk ? "Masuk…" : "Masuk"}
        </button>
      </form>
    </div>
  );
}
