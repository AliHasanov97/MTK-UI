import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for the Docker build: produces a self-contained .next/standalone
  // server (only the node_modules it actually needs) instead of requiring the
  // full node_modules tree in the runtime image.
  output: "standalone",
};

export default nextConfig;
