import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh[3-6].googleusercontent.com",
      },
    ],
  },
};

export default nextConfig;
