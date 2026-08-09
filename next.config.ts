import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the tracing root so Next does not infer a workspace root from stray
  // lockfiles (a git worktree of this repo carries its own package-lock.json).
  outputFileTracingRoot: __dirname,
};

export default nextConfig;
