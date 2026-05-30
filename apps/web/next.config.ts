import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Transpila o pacote workspace consumido como TypeScript-source.
  transpilePackages: ["@jotaduo/shared"],
  experimental: {
    // Permite Server Actions a partir do app.
  },
};

export default nextConfig;
