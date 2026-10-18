import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    localPatterns: [
      { pathname: "/listings/listing-*.jpg", search: "?v=2" },
      { pathname: "/listings/hero-apartment.jpg", search: "" },
    ],
    remotePatterns: [
      // Cloudinary, where production listing images will be served from.
      // Mock imagery is local (`public/listings/`) so no other host is needed.
      { protocol: "https", hostname: "res.cloudinary.com", pathname: "/**" },
    ],
  },
};

export default nextConfig;
