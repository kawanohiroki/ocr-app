import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // heic-convertとsharpはサーバー側のみで使用するためバンドルから除外
  serverExternalPackages: ["heic-convert", "sharp"],
};

export default nextConfig;
