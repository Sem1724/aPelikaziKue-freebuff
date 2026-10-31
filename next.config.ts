import type { NextConfig } from "next";

// Origin preview (mis. pv-xxxx.style.dev) diambil dari env agar tidak ditulis
// permanen di dalam repositori dan tetap ikut saat VM dipulihkan.
const previewHost = process.env.PREVIEW_HOSTNAME;

const nextConfig: NextConfig = {
  allowedDevOrigins: previewHost ? [previewHost] : [],
};

export default nextConfig;
