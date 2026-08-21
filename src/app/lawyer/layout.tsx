import { requireRole } from "@/lib/api/server-auth";

/**
 * Lawyer area. LAWYER is granted by an administrator, never self-claimed.
 *
 * Early exit only — see the note in `src/app/admin/layout.tsx`.
 */
export default async function LawyerLayout({ children }: LayoutProps<"/lawyer">) {
  await requireRole(["LAWYER", "ADMIN"]);
  return <>{children}</>;
}
