import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "censio.dk",
        pathname: "/wp-content/uploads/**",
      },
      {
        protocol: "https",
        hostname: "cdn.trustpilot.net",
        pathname: "/brand-assets/**",
      },
    ],
  },
};

export default nextConfig;
