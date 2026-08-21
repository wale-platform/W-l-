import { requireUser } from "@/lib/api/server-auth";

/**
 * Notifications are per-account, so a session is required but no role is.
 *
 * Early exit only — see the note in `src/app/admin/layout.tsx`.
 */
export default async function NotificationsLayout({
  children,
}: LayoutProps<"/notifications">) {
  await requireUser();
  return <>{children}</>;
}
