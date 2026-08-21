import { requireUser } from "@/lib/api/server-auth";

/**
 * Every account has a profile, so this needs a session but no particular role.
 *
 * Early exit only — see the note in `src/app/admin/layout.tsx`.
 */
export default async function ProfileLayout({ children }: LayoutProps<"/profile">) {
  await requireUser();
  return <>{children}</>;
}
