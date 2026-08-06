import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { properties } from "@/lib/fixtures/properties";

/**
 * Static routes plus one entry per listing.
 *
 * Reads the fixtures directly today; once a real backend exists this
 * becomes a fetch, which is why it's already `async`.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: siteConfig.url, changeFrequency: "daily", priority: 1 },
    { url: `${siteConfig.url}/properties`, changeFrequency: "hourly", priority: 0.9 },
    { url: `${siteConfig.url}/about`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${siteConfig.url}/faq`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${siteConfig.url}/contact`, changeFrequency: "yearly", priority: 0.5 },
    { url: `${siteConfig.url}/login`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${siteConfig.url}/register`, changeFrequency: "yearly", priority: 0.4 },
  ];

  const listingRoutes: MetadataRoute.Sitemap = properties.map((property) => ({
    url: `${siteConfig.url}/properties/${property.id}`,
    lastModified: new Date(property.updatedAt),
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...staticRoutes, ...listingRoutes];
}
