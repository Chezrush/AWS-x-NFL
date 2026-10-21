import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  output: "standalone",
  distDir: process.env.NFL_BUILD_DIR || ".next",
  outputFileTracingRoot: process.cwd(),
  outputFileTracingIncludes: { "/*": ["./data/*.json"] },
};

export default createNextIntlPlugin()(nextConfig);
