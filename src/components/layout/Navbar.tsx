"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui";
import { Container } from "./Container";
import { mainNav } from "@/config/site";
import { cn } from "@/lib/utils/cn";
import { dashboardPath, useLogout, useSession } from "@/lib/auth/client-session";

export function Navbar() {
  const pathname = usePathname();

  // The menu is stored as "the path it was opened on" rather than a
  // boolean, so a navigation closes it during render. A `useEffect` that
  // called setState on pathname change would work too, but costs an extra
  // render pass and trips react-hooks/set-state-in-effect.
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const open = openedOn === pathname;

  // Prevent the page behind the open menu from scrolling.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const { data: user, isPending: sessionPending } = useSession();
  const logout = useLogout();
  const isLoggedIn = Boolean(user);
  const handleLogout = () => logout.mutate();
  const getDashboardHref = () => (user ? dashboardPath(user.role) : "/login");

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-40 border-b border-ink-100 bg-white/85 backdrop-blur-md">
      <Container size="wide">
        <div className="flex h-16 items-center justify-between gap-6 lg:h-18">
          <Link href="/" className="rounded-field" aria-label="WALE Housing — home">
            <Logo />
          </Link>

          <nav aria-label="Main" className="hidden lg:block">
            <ul className="flex items-center gap-1">
              {mainNav.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isActive(item.href) ? "page" : undefined}
                    className={cn(
                      "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                      isActive(item.href)
                         ? "bg-brand-50 text-brand-800"
                        : "text-ink-600 hover:bg-ink-50 hover:text-ink-900",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Kept invisible (not removed) while the session loads, so a
              signed-in user doesn't see "Log in" flash and the layout holds. */}
          <div className={cn("hidden items-center gap-2 lg:flex", sessionPending && "invisible")}>
            {isLoggedIn ? (
              <>
                <Link href={getDashboardHref()}>
                  <Button tone="ghost" size="sm">
                    Dashboard
                  </Button>
                </Link>
                <Button tone="outline" size="sm" onClick={handleLogout}>
                  Log out
                </Button>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button tone="ghost" size="sm">
                    Log in
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button size="sm">Sign up</Button>
                </Link>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setOpenedOn(open ? null : pathname)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            className="rounded-full p-2 text-ink-700 transition-colors hover:bg-ink-100 lg:hidden"
          >
            {open ? (
              <X aria-hidden="true" className="size-5" />
            ) : (
              <Menu aria-hidden="true" className="size-5" />
            )}
          </button>
        </div>
      </Container>

      {open && (
        <div
          id="mobile-nav"
          className="border-t border-ink-100 bg-white lg:hidden"
        >
          <Container size="wide">
            <nav aria-label="Mobile" className="py-4">
              <ul className="flex flex-col gap-1">
                {mainNav.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={isActive(item.href) ? "page" : undefined}
                      className={cn(
                        "block rounded-full px-4 py-2.5 text-sm font-medium transition-colors",
                        isActive(item.href)
                          ? "bg-brand-50 text-brand-800"
                          : "text-ink-700 hover:bg-ink-50",
                      )}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>

              <div className={cn("mt-4 flex flex-col gap-2 border-t border-ink-100 pt-4", sessionPending && "invisible")}>
                {isLoggedIn ? (
                  <>
                    <Link href={getDashboardHref()} className="w-full">
                      <Button block>Dashboard</Button>
                    </Link>
                    <Button tone="outline" block onClick={handleLogout}>
                      Log out
                    </Button>
                  </>
                ) : (
                  <>
                    <Link href="/signup" className="w-full">
                      <Button block>Sign up</Button>
                    </Link>
                    <Link href="/login" className="w-full">
                      <Button tone="outline" block>
                        Log in
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </nav>
          </Container>
        </div>
      )}
    </header>
  );
}
