import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts"],
  },
  async headers() {
    return [
      {
        // Cache-Control is deliberately not set here: a header from this config
        // overrides the one a route sets, which used to force `no-store` on
        // every endpoint (including /api/catalog). Each route sets its own
        // policy via apiCached / apiError / explicit headers in lib/api.ts.
        source: "/api/:path*",
        headers: [{ key: "X-Content-Type-Options", value: "nosniff" }],
      },
    ];
  },
};

export default nextConfig;
