import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/hachiware-techo",
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
