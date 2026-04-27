import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // ----------------------------------------------------------------------------
  // TODO(infra): Next 15.5.15 ships a regression in its auto-generated PageProps
  // route types that incorrectly references `ResolvingMetadata` as a namespace.
  // Until we pin to a fixed patch (or upstream resolves it), let `next build`
  // skip TS validation. We still get full TS checking via `npm run typecheck`
  // in CI / locally — this only relaxes the Vercel build gate.
  // ----------------------------------------------------------------------------
  typescript: { ignoreBuildErrors: true },
  experimental: {
    // Server actions get a generous body size for document uploads later.
    serverActions: { bodySizeLimit: "5mb" },
  },
  // Defense-in-depth headers. Cloudflare WAF in front sets stricter ones in prod.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
