import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@rockbed/api", "@rockbed/shared", "@rockbed/db"],
};

export default nextConfig;
