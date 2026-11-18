import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Strict-Transport-Security", value: "max-age=63072000" },
        { key: "X-Frame-Options", value: "SAMEORIGIN" },
        { key: "Permissions-Policy", value: "microphone=(self), camera=(), geolocation=()" },
        { key: "Content-Security-Policy-Report-Only", value: "default-src 'self'; base-uri 'self'; form-action 'self' https://accounts.spotify.com; frame-ancestors 'self'; img-src 'self' data: blob: https://i.scdn.co https://*.scdn.co; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' https://api.spotify.com https://accounts.spotify.com; object-src 'none'" },
      ],
    }];
  },
};

export default nextConfig;
