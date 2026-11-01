"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { LogOut, Menu, Wallet, X } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { EmailVerificationBanner } from "@/components/auth/EmailVerificationBanner";
import { Avatar, ConfirmDialog } from "@/components/ui";
import { activeHref, navigationFor, type NavSection } from "@/config/app-navigation";
import type { AuthUser } from "@/lib/api/auth";
import { walletApi } from "@/lib/api/wallet";
import { dashboardPath, useLogout } from "@/lib/auth/client-session";
import { cn } from "@/lib/utils/cn";
import { formatNaira } from "@/lib/utils/format";
import { NotificationsMenu } from "./NotificationsMenu";
import { walletKey } from "./query-keys";
import { UserMenu } from "./UserMenu";

/**
 * The signed-in frame used on every page once a user is logged in:
 * a fixed sidebar on desktop (a drawer on mobile) and a header with the
 * user's name, role, wallet balance and notifications.
 *
 * `padded` adds dashboard spacing around the page; public pages that
 * manage their own full-width sections pass `padded={false}`.
 */
export function AppShell({
  user,
  children,
  footer,
  padded = true,
}: {
  user: AuthUser;
  children: ReactNode;
  footer?: ReactNode;
  padded?: boolean;
}) {
  const pathname = usePathname();
  const sections = navigationFor(user.role);
  const current = activeHref(sections, pathname);

  // Stored as "the path the drawer was opened on" so navigating closes it
  // during render, without a setState-in-effect.
  const [drawerOpenedOn, setDrawerOpenedOn] = useState<string | null>(null);
  const drawerOpen = drawerOpenedOn === pathname;

  // Every "Log out" (sidebar, drawer, avatar menu) asks first.
  const logout = useLogout();
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const askToLogout = () => {
    setDrawerOpenedOn(null);
    setConfirmingLogout(true);
  };

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  return (
    <div className="min-h-screen bg-ink-50/50">
      {/* Desktop sidebar: fixed, always visible, scrolls on its own. */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-ink-200 bg-white lg:flex">
        <div className="flex h-16 shrink-0 items-center border-b border-ink-100 px-6">
          <Link href={dashboardPath(user.role)} aria-label="Go to your dashboard">
            <Logo />
          </Link>
        </div>
        <SidebarNav sections={sections} current={current} />
        <SidebarFooter user={user} onLogout={askToLogout} />
      </aside>

      <div className="flex min-h-screen flex-col lg:pl-64">
        <AppHeader user={user} onOpenMenu={() => setDrawerOpenedOn(pathname)} onLogout={askToLogout} />

        <main
          id="main"
          className={cn(
            "flex-1",
            // Dashboard spacing: a small gap under the header, and pages'
            // first <Section> drops its marketing-size top padding here.
            padded &&
              "px-4 pb-8 pt-4 sm:px-6 lg:px-8 lg:pt-5 [&>main>section:first-of-type]:pt-0 [&>section:first-of-type]:pt-0",
          )}
        >
          <div className={cn(!padded && "px-4 pt-4 empty:hidden sm:px-6 lg:px-8")}>
            <EmailVerificationBanner />
          </div>
          {children}
        </main>
        {footer}
      </div>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setDrawerOpenedOn(null)}
            className="absolute inset-0 bg-ink-950/40 backdrop-blur-sm"
          />
          <div className="relative flex h-full w-72 max-w-[85vw] flex-col bg-white shadow-lifted">
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-ink-100 px-4">
              <Logo />
              <button
                type="button"
                onClick={() => setDrawerOpenedOn(null)}
                aria-label="Close menu"
                className="rounded-full p-2 text-ink-500 hover:bg-ink-50 hover:text-ink-900"
              >
                <X className="size-5" />
              </button>
            </div>
            <SidebarNav sections={sections} current={current} />
            <SidebarFooter user={user} onLogout={askToLogout} />
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmingLogout}
        onClose={() => setConfirmingLogout(false)}
        onConfirm={() => logout.mutate()}
        title="Log out of WALE?"
        description="You'll need to sign in again to see your dashboard, wallet and notifications."
        confirmLabel="Log out"
        tone="danger"
        isLoading={logout.isPending}
      />
    </div>
  );
}

function SidebarNav({ sections, current }: { sections: NavSection[]; current: string | null }) {
  return (
    <nav aria-label="Sidebar" className="flex-1 overflow-y-auto px-3 py-4">
      {sections.map((section, index) => (
        <div key={section.title ?? index} className={cn(index > 0 && "mt-6")}>
          {section.title && (
            <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-[0.14em] text-ink-400">
              {section.title}
            </p>
          )}
          <ul className="space-y-1">
            {section.items.map((item) => {
              const isActive = item.href === current;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-full px-4 py-2.5 text-sm font-medium transition-colors",
                      isActive ? "bg-brand-50 text-brand-800" : "text-ink-600 hover:bg-ink-50 hover:text-ink-900",
                    )}
                  >
                    <item.icon aria-hidden="true" className="size-4 shrink-0" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function SidebarFooter({ user, onLogout }: { user: AuthUser; onLogout: () => void }) {
  return (
    <div className="shrink-0 space-y-3 border-t border-ink-100 p-3">
      <div className="flex items-center gap-3 px-2">
        <Avatar name={user.fullName} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink-950">{user.fullName}</p>
          <p className="truncate text-xs text-ink-500">{user.email}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onLogout}
        className="flex w-full items-center gap-3 rounded-full px-4 py-2.5 text-sm font-medium text-danger transition-colors hover:bg-danger-subtle"
      >
        <LogOut aria-hidden="true" className="size-4 shrink-0" />
        Log out
      </button>
    </div>
  );
}

function AppHeader({
  user,
  onOpenMenu,
  onLogout,
}: {
  user: AuthUser;
  onOpenMenu: () => void;
  onLogout: () => void;
}) {
  const hasWallet = user.role !== "admin";

  const wallet = useQuery({
    queryKey: walletKey,
    queryFn: walletApi.get,
    enabled: hasWallet,
    staleTime: 30_000,
  });
  const firstName = user.fullName.split(/\s+/)[0];

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-ink-200 bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8">
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label="Open menu"
        className="rounded-full p-2 text-ink-600 hover:bg-ink-50 hover:text-ink-900 lg:hidden"
      >
        <Menu className="size-6" />
      </button>
      <Link href={dashboardPath(user.role)} aria-label="Go to your dashboard" className="lg:hidden">
        <Logo />
      </Link>

      <p className="hidden truncate text-sm text-ink-600 lg:block">
        Welcome back, <span className="font-semibold text-ink-900">{firstName}</span>
      </p>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        {hasWallet && (
          <Link
            href="/wallet"
            className="flex items-center gap-2 rounded-full border border-brand-100 bg-brand-50/60 px-3 py-1.5 text-sm transition-colors hover:border-brand-300 hover:bg-brand-50"
            aria-label={
              wallet.data ? `Wallet balance ${formatNaira(wallet.data.balanceKobo / 100)}` : "Wallet"
            }
          >
            <Wallet aria-hidden="true" className="size-4 text-brand-800" />
            <span className="hidden text-xs text-ink-500 sm:inline">Balance</span>
            <span className="font-bold tabular-nums text-ink-900">
              {wallet.data ? formatNaira(wallet.data.balanceKobo / 100) : wallet.isError ? "—" : "…"}
            </span>
          </Link>
        )}

        <NotificationsMenu />

        <UserMenu user={user} onLogout={onLogout} />
      </div>
    </header>
  );
}
