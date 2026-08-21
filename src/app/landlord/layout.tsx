import { requireRole } from "@/lib/api/server-auth";

/**
 * Landlord area. ADMIN is allowed through for support staff; the backend still
 * checks ownership on every write, so this grants sight, not authority.
 *
 * Early exit only — see the note in `src/app/admin/layout.tsx`.
 */
export default async function LandlordLayout({ children }: LayoutProps<"/landlord">) {
  await requireRole(["LANDLORD", "ADMIN"]);
  return <>{children}</>;
}
