import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@bedrock-provisioner/api", "@bedrock-provisioner/shared", "@bedrock-provisioner/db"],
  serverExternalPackages: ["@prisma/client"],
};

export default nextConfig;
