import type { NextConfig } from "next";

const config: NextConfig = {
  // Static export for Cloudflare Pages compatibility. The output directory is
  // `out/` and contains the production-ready HTML/CSS/JS that can be deployed
  // to any static host (Cloudflare Pages, Workers static assets, etc.).
  output: "export",

  // Image optimization is disabled because it requires a Node runtime, which
  // is incompatible with pure-static export. The landing page does not need
  // image optimization; the hero map and visuals are inline SVG.
  images: { unoptimized: true },

  // Trailing slash is enabled so static export produces canonical URLs that
  // match how Cloudflare Pages serves them. Both `/id/` and `/en/` are
  // emitted as directory + index.html.
  trailingSlash: true,

  // React Strict Mode helps catch subtle bugs during development.
  reactStrictMode: true,
};

export default config;