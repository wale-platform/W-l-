import { requireRole } from "@/lib/api/server-auth";

/**
 * Tenant area — also home for MOVER, since an outgoing tenant documenting the
 * place they lived in is the same person at the next step of the same journey,
 * and `roleHomePath` sends both here.
 *
 * Early exit only — see the note in `src/app/admin/layout.tsx`.
 */
export default async function TenantLayout({ children }: LayoutProps<"/tenant">) {
  await requireRole(["TENANT", "MOVER", "ADMIN"]);
  return <>{children}</>;
}
