import { requireRole } from "@/lib/api/server-auth";

/**
 * Admin area.
 *
 * This is an EARLY EXIT, not the protection. A layout cannot stop the page
 * beneath it from rendering (see `server-auth.ts`), so every page in this area
 * calls `requireRole()` itself — that is what actually gates the markup. The
 * check here costs nothing extra: `getServerUser()` is `cache()`d, so the layout
 * and the page share one backend round-trip.
 *
 * Its value is that a page added later without its own guard still gets turned
 * away here rather than rendering wide open.
 */
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requireRole(["ADMIN"]);
  return <>{children}</>;
}
