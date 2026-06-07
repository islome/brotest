import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Question/sign images come from arbitrary remote hosts (avtotestu.uz,
  // Supabase storage). Serve them as-is instead of through the Image
  // Optimizer so no per-host allowlist is needed.
  images: { unoptimized: true },
};

export default nextConfig;
