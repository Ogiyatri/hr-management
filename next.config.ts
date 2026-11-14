import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // Dev server berjalan sebagai "localhost"; izinkan juga 127.0.0.1 (link email Supabase lokal)
  allowedDevOrigins: ["127.0.0.1"],
  partialPrefetching: true,
  experimental: {
    // Lampiran cuti & CV (maks. 4 MB). Vercel membatasi body request 4,5 MB.
    serverActions: { bodySizeLimit: "4.5mb" },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
