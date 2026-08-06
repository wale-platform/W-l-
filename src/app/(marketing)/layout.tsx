import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

/**
 * Shell for the public marketing pages.
 *
 * A route group `(marketing)` rather than a path segment, so these pages
 * keep clean top-level URLs (`/about`, not `/marketing/about`) while
 * still sharing this chrome. The authed dashboard (pass 3) gets its own
 * group with a sidebar instead.
 */
export default function MarketingLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <Navbar />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer />
    </>
  );
}
