"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  onConfirm: () => void;
  children: React.ReactNode;
  className?: string;
  pesanYakin?: string;
  judul?: string;
  disabled?: boolean;
};

/**
 * Tombol yang harus ditekan dua kali. Tekanan pertama berubah menjadi "Yakin?"
 * selama 3 detik, sehingga aksi hapus tidak pernah tidak sengaja terjadi.
 */
export function TombolYakin({
  onConfirm,
  children,
  className = "btn btn-danger",
  pesanYakin = "Yakin?",
  judul,
  disabled,
}: Props) {
  const [yakin, setYakin] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return (
    <button
      type="button"
      className={className}
      title={judul}
      disabled={disabled}
      aria-live="polite"
      onClick={() => {
        if (yakin) {
          if (timer.current) clearTimeout(timer.current);
          setYakin(false);
          onConfirm();
          return;
        }
        setYakin(true);
        timer.current = setTimeout(() => setYakin(false), 3000);
      }}
    >
      {yakin ? pesanYakin : children}
    </button>
  );
}
