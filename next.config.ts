import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // `images.domains` was removed in Next 16 — `remotePatterns` is the
    // only supported form, and it is stricter about protocol and path.
    remotePatterns: [
      // Cloudinary, where production listing images will be served from.
      // Mock imagery is local (`public/listings/`) so no other host is needed.
      { protocol: "https", hostname: "res.cloudinary.com", pathname: "/**" },
    ],
  },
};

export default nextConfig;
