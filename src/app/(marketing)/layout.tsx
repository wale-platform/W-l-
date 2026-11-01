import { SiteChrome } from "@/components/layout/SiteChrome";

/**
 * Shell for the public marketing pages.
 *
 * A route group `(marketing)` rather than a path segment, so these pages
 * keep clean top-level URLs (`/about`, not `/marketing/about`) while
 * still sharing this chrome. Signed-in users see the app sidebar and
 * header here too (see SiteChrome).
 */
export default function MarketingLayout({ children }: LayoutProps<"/">) {
  return <SiteChrome>{children}</SiteChrome>;
}
