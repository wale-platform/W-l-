"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, ChevronDown, LayoutDashboard, LogOut, User as UserIcon } from "lucide-react";
import { useAuth, useAuthActions } from "@/hooks/useAuth";
import { roleLabels } from "@/lib/api/schemas";
import { Avatar, Button } from "@/components/ui";
import { cn } from "@/lib/utils/cn";

/**
 * Signed-in account menu for the navbar.
 *
 * Three states, not two. While the first `GET /auth/me` is in flight we know
 * nothing, so rendering "Log in" would flash the wrong thing at a signed-in
 * user on every page load; a placeholder of roughly the right width keeps the
 * header from shifting once the answer arrives.
 *
 * Nothing here is a security boundary — it decides what to *show*. The backend
 * authorizes every request independently, so a hidden link is a convenience,
 * not a lock.
 */
export function UserMenu() {
  const { user, isLoading, roles, homePath } = useAuth();
  const { logout } = useAuthActions();
  const pathname = usePathname();
  const menuId = useId();

  // Stored as "the path it was opened on" so a navigation closes the menu
  // during render, matching the pattern the mobile nav in Navbar.tsx uses.
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const open = openedOn === pathname;
  const close = () => setOpenedOn(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // A dropdown that only closes on its own trigger feels broken, so handle the
  // two ways people actually dismiss one: Escape, and clicking elsewhere.
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenedOn(null);
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpenedOn(null);
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  if (isLoading) {
    return (
      <div
        aria-hidden="true"
        className="h-9 w-32 animate-pulse rounded-field bg-ink-100"
      />
    );
  }

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Link href={signInHref(pathname)}>
          <Button tone="ghost" size="sm">
            Log in
          </Button>
        </Link>
        <Link href="/register">
          <Button size="sm">Create account</Button>
        </Link>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpenedOn(open ? null : pathname)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        className={cn(
          "flex items-center gap-2 rounded-field py-1.5 pl-1.5 pr-2.5 text-sm font-medium",
          "text-ink-800 transition-colors hover:bg-ink-50",
          open && "bg-ink-50",
        )}
      >
        <Avatar name={user.name} src={user.avatar} size="sm" />
        <span className="max-w-28 truncate">{user.firstName ?? user.name}</span>
        <ChevronDown
          aria-hidden="true"
          className={cn("size-4 text-ink-500 transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          className={cn(
            "absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-card",
            "border border-ink-100 bg-white shadow-lg",
          )}
        >
          <div className="border-b border-ink-100 px-4 py-3">
            <p className="truncate text-sm font-semibold text-ink-900">{user.name}</p>
            <p className="truncate text-xs text-ink-600">{user.email}</p>
            {/* Every role, not just the primary one: someone who is both a
                tenant and a mover should see that reflected here. */}
            <p className="mt-1.5 text-xs font-medium text-brand-700">
              {roles.map((role) => roleLabels[role]).join(" · ")}
            </p>
          </div>

          <div className="py-1">
            <MenuLink href={homePath} icon={LayoutDashboard} onNavigate={close}>
              Dashboard
            </MenuLink>
            <MenuLink href="/profile" icon={UserIcon} onNavigate={close}>
              Profile
            </MenuLink>
            <MenuLink href="/notifications" icon={Bell} onNavigate={close}>
              Notifications
            </MenuLink>
          </div>

          <div className="border-t border-ink-100 py-1">
            <button
              type="button"
              role="menuitem"
              disabled={logout.isPending}
              onClick={() => {
                close();
                logout.mutate();
              }}
              className={cn(
                "flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium",
                "text-ink-700 transition-colors hover:bg-ink-50 disabled:opacity-60",
              )}
            >
              <LogOut aria-hidden="true" className="size-4 text-ink-500" />
              {logout.isPending ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Signed-out navbar block for the mobile menu, and the signed-in equivalent.
 * Kept separate from the dropdown because a slide-down panel has the room to
 * list everything inline — a nested dropdown inside it would be fiddly to hit
 * on a phone.
 */
export function MobileAuthBlock({ onNavigate }: { onNavigate: () => void }) {
  const { user, isLoading, roles, homePath } = useAuth();
  const { logout } = useAuthActions();
  const pathname = usePathname();

  if (isLoading) {
    return <div aria-hidden="true" className="h-11 animate-pulse rounded-field bg-ink-100" />;
  }

  if (!user) {
    return (
      <>
        <Link href={signInHref(pathname)} onClick={onNavigate}>
          <Button tone="outline" block>
            Log in
          </Button>
        </Link>
        <Link href="/register" onClick={onNavigate}>
          <Button block>Create account</Button>
        </Link>
      </>
    );
  }

  return (
    <>
      <div className="flex items-center gap-3 px-1 pb-1">
        <Avatar name={user.name} src={user.avatar} size="md" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink-900">{user.name}</p>
          <p className="truncate text-xs text-ink-600">
            {roles.map((role) => roleLabels[role]).join(" · ")}
          </p>
        </div>
      </div>

      <MenuLink href={homePath} icon={LayoutDashboard} onNavigate={onNavigate}>
        Dashboard
      </MenuLink>
      <MenuLink href="/profile" icon={UserIcon} onNavigate={onNavigate}>
        Profile
      </MenuLink>
      <MenuLink href="/notifications" icon={Bell} onNavigate={onNavigate}>
        Notifications
      </MenuLink>

      <Button
        tone="outline"
        block
        isLoading={logout.isPending}
        onClick={() => {
          onNavigate();
          logout.mutate();
        }}
      >
        Sign out
      </Button>
    </>
  );
}

/* ----------------------------------------------------------------- shared -- */

function MenuLink({
  href,
  icon: Icon,
  onNavigate,
  children,
}: {
  href: string;
  icon: typeof UserIcon;
  onNavigate: () => void;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-2.5 rounded-field px-4 py-2.5 text-sm font-medium",
        "text-ink-700 transition-colors hover:bg-ink-50",
      )}
    >
      <Icon aria-hidden="true" className="size-4 text-ink-500" />
      {children}
    </Link>
  );
}

/**
 * Send the visitor back where they were after signing in — but only from a real
 * page. Carrying `next` out of `/login` or `/register` would bounce them
 * straight back to the form they just left.
 */
function signInHref(pathname: string): string {
  if (pathname === "/" || pathname.startsWith("/login") || pathname.startsWith("/register")) {
    return "/login";
  }
  return `/login?next=${encodeURIComponent(pathname)}`;
}
