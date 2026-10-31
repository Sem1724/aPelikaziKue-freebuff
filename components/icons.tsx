"use client";

import type { SVGProps } from "react";

type Ikon = (props: SVGProps<SVGSVGElement>) => React.ReactElement;

const dasar = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export const IkonInput: Ikon = (p) => (
  <svg {...dasar} {...p}>
    <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
    <rect x="9" y="3" width="6" height="4" rx="1" />
    <path d="M9 12h6M9 16h4" />
  </svg>
);

export const IkonLaporan: Ikon = (p) => (
  <svg {...dasar} {...p}>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5M9 13h6M9 17h6" />
  </svg>
);

export const IkonUntung: Ikon = (p) => (
  <svg {...dasar} {...p}>
    <path d="M3 17l6-6 4 4 8-8" />
    <path d="M21 7v5h-5" />
  </svg>
);

export const IkonGantungan: Ikon = (p) => (
  <svg {...dasar} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8v4M12 16h.01" />
  </svg>
);

export const IkonRekap: Ikon = (p) => (
  <svg {...dasar} {...p}>
    <rect x="3" y="4" width="18" height="17" rx="2" />
    <path d="M8 2v4M16 2v4M3 10h18M8 15h3M8 18h6" />
  </svg>
);

export const IkonMaster: Ikon = (p) => (
  <svg {...dasar} {...p}>
    <ellipse cx="12" cy="6" rx="8" ry="3" />
    <path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6" />
    <path d="M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
  </svg>
);

export const IkonCadangan: Ikon = (p) => (
  <svg {...dasar} {...p}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <path d="M7 10l5 5 5-5M12 15V3" />
  </svg>
);

export const IkonSalin: Ikon = (p) => (
  <svg {...dasar} {...p}>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15V5a2 2 0 0 1 2-2h10" />
  </svg>
);

export const IkonWhatsApp: Ikon = (p) => (
  <svg {...dasar} {...p}>
    <path d="M21 11.5a8.5 8.5 0 0 1-12.6 7.5L3 21l2-5.4A8.5 8.5 0 1 1 21 11.5z" />
    <path d="M8.5 9.5c0 3.5 2.5 6 6 6" />
  </svg>
);

export const IkonPdf: Ikon = (p) => (
  <svg {...dasar} {...p}>
    <path d="M12 3v12M7 10l5 5 5-5" />
    <path d="M4 19h16" />
  </svg>
);

export const IkonMata: Ikon = (p) => (
  <svg {...dasar} {...p}>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const IkonMataTutup: Ikon = (p) => (
  <svg {...dasar} {...p}>
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <path d="M1 1l22 22" />
  </svg>
);

export const IkonKue: Ikon = (p) => (
  <svg {...dasar} {...p}>
    <path d="M4 20h16M5 20v-6a7 7 0 0 1 14 0v6" />
    <path d="M12 7V4M9 20v-4M15 20v-4" />
  </svg>
);
