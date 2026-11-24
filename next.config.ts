import type { NextConfig } from "next";

const incubatorHeaders = [
  { key: "X-Frame-Options", value: "DENY" }, // the launch page signs transactions: never allow it inside someone else's frame
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

// API routes only ever answer JSON or raster images, so nothing there needs to run or load anything.
const apiHeaders = incubatorHeaders.map((h) => (h.key === "Content-Security-Policy" ? { ...h, value: "default-src 'none'; frame-ancestors 'none'" } : h));

const nextConfig: NextConfig = {
  async headers() {
    return [
      ...["/incubator", "/incubator/:path*"].map((source) => ({ source, headers: incubatorHeaders })),
      { source: "/api/incubator/:path*", headers: apiHeaders },
    ];
  },
};

export default nextConfig;
