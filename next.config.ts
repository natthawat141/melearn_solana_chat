import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  allowedDevOrigins: ["chat.melearn.io"],
  poweredByHeader: false,
  devIndicators: false,
  // This folder is also opened through a symlink of the same path, so Next
  // sees package-lock.json twice and can pick the wrong root.
  turbopack: { root: projectRoot },
  outputFileTracingRoot: projectRoot,
  // Artwork is already compressed locally. Avoid the runtime image cache, whose
  // directory scan can pick up AppleDouble metadata on this external drive.
  images: { unoptimized: true },
};

export default nextConfig;
