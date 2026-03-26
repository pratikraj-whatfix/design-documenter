import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["fs", "path", "os"],
};

export default nextConfig;
