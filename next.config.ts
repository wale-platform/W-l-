import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    localPatterns: [
      { pathname: "/listings/listing-*.jpg", search: "?v=2" },
      { pathname: "/listings/hero-apartment.jpg", search: "" },
      // Fluent 3D emoji stickers (auth page).
      { pathname: "/emoji/*.png", search: "" },
      // Photos uploaded with listings, served from Neon.
      { pathname: "/api/property-images/**", search: "" },
    ],
    remotePatterns: [
      // Cloudinary, where production listing images will be served from.
      // Mock imagery is local (`public/listings/`) so no other host is needed.
      { protocol: "https", hostname: "res.cloudinary.com", pathname: "/**" },
    ],
  },
  // lucide-react's CommonJS build (its `main`) calls React.createContext at
  // load time with no "use client" marker, which crashes Server Components.
  // Its ESM build marks those modules "use client". Next normally rewrites
  // icon imports to the ESM files (optimizePackageImports), but that is an
  // SWC transform that doesn't always run (e.g. with SWC's WASM fallback),
  // so resolve the package to ESM explicitly.
  webpack(config) {
    config.resolve.alias = {
      ...config.resolve.alias,
      "lucide-react$": "lucide-react/dist/esm/lucide-react.mjs",
    };
    return config;
  },
  turbopack: {
    resolveAlias: {
      "lucide-react": "lucide-react/dist/esm/lucide-react.mjs",
    },
  },
};

export default nextConfig;
