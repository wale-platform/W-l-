import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Authed surfaces and the mock API have nothing useful to crawl.
        disallow: ["/api/", "/dashboard/", "/profile/"],
      },
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
