import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Parent ~/package-lock.json confuses workspace root detection.
  outputFileTracingRoot: projectRoot,
  turbopack: {
    root: projectRoot,
  },
  async rewrites() {
    return [
      {
        source: "/backend",
        destination: "http://localhost:3001/",
      },
      {
        source: "/backend/:path*",
        destination: "http://localhost:3001/:path*",
      },
    ];
  },
};

export default nextConfig;
