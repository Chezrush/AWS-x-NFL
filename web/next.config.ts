import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = { output: "standalone", outputFileTracingRoot: process.cwd() };

export default createNextIntlPlugin()(nextConfig);
