"use client";

import { useId } from "react";
import Link from "next/link";
import { Bell, ChevronDown, LayoutDashboard, LogOut, Settings, Wallet, type LucideIcon } from "lucide-react";
import { Avatar } from "@/components/ui";
import type { AuthUser } from "@/lib/api/auth";
import { dashboardPath } from "@/lib/auth/client-session";
import { cn } from "@/lib/utils/cn";
import { useDropdown } from "./use-dropdown";

export const roleLabels: Record<AuthUser["role"], string> = {
  student: "Student",
  landlord: "Landlord",
  lawyer: "Property lawyer",
  tenant: "Outgoing tenant",
  admin: "Administrator",
};

/** Header avatar: opens a menu with the account, shortcuts and log out. */
export function UserMenu({ user, onLogout }: { user: AuthUser; onLogout: () => void }) {
  const menuId = useId();
  const { open, container, trigger, toggle, close } = useDropdown();

  const links: { href: string; label: string; icon: LucideIcon }[] = [
    { href: dashboardPath(user.role), label: "Dashboard", icon: LayoutDashboard },
    { href: "/account", label: "Account settings", icon: Settings },
    ...(user.role === "admin" ? [] : [{ href: "/wallet", label: "Wallet", icon: Wallet }]),
    { href: "/notifications", label: "Notifications", icon: Bell },
  ];

  return (
    <div ref={container} className="relative">
      <button
        ref={trigger}
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls={menuId}
        aria-haspopup="menu"
        aria-label={`Account menu for ${user.fullName}`}
        className={cn(
          "flex items-center gap-2.5 rounded-full py-1 pl-1 pr-1 transition-colors hover:bg-ink-50 sm:pr-2.5",
          open && "bg-ink-50",
        )}
      >
        <Avatar name={user.fullName} size="sm" />
        <span className="hidden min-w-0 flex-col text-left leading-tight sm:flex">
          <span className="max-w-40 truncate text-sm font-semibold text-ink-900">{user.fullName}</span>
          <span className="text-xs text-ink-500">{roleLabels[user.role]}</span>
        </span>
        <ChevronDown
          aria-hidden="true"
          className={cn("hidden size-4 text-ink-400 transition-transform sm:block", open && "rotate-180")}
        />
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label="Account"
          className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-3xl border border-ink-100 bg-white shadow-[0_24px_60px_-16px_rgba(14,17,16,0.25)]"
        >
          <div className="flex items-center gap-3 border-b border-ink-100 bg-gradient-to-br from-[#fff8fb] to-white p-4">
            <Avatar name={user.fullName} />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-ink-900">{user.fullName}</p>
              <p className="truncate text-xs text-ink-500">{user.email}</p>
              <span className="mt-1 inline-block rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-800">
                {roleLabels[user.role]}
              </span>
            </div>
          </div>

          <ul className="p-1.5">
            {links.map((link) => (
              <li key={link.href} role="none">
                <Link
                  href={link.href}
                  role="menuitem"
                  onClick={close}
                  className="flex items-center gap-3 rounded-full px-4 py-2.5 text-sm font-medium text-ink-700 transition-colors hover:bg-ink-50 hover:text-ink-900"
                >
                  <link.icon aria-hidden="true" className="size-4 text-ink-400" />
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="border-t border-ink-100 p-1.5">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                close();
                onLogout();
              }}
              className="flex w-full items-center gap-3 rounded-full px-4 py-2.5 text-sm font-semibold text-danger transition-colors hover:bg-danger-subtle"
            >
              <LogOut aria-hidden="true" className="size-4" />
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
