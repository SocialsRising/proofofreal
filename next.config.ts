import type { NextConfig } from "next";

const incubatorHeaders = [
  { key: "X-Frame-Options", value: "DENY" }, // the launch page signs transactions: never allow it inside someone else's frame
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
];

const nextConfig: NextConfig = {
  async headers() {
    return ["/incubator", "/incubator/:path*", "/api/incubator/:path*"].map((source) => ({ source, headers: incubatorHeaders }));
  },
};

export default nextConfig;
