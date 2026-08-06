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
                      "rounded-field px-3 py-2 text-sm font-medium transition-colors",
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

          <div className="hidden items-center gap-2 lg:flex">
            <Link href="/login">
              <Button tone="ghost" size="sm">
                Log in
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm">Create account</Button>
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setOpenedOn(open ? null : pathname)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            className="rounded-field p-2 text-ink-700 transition-colors hover:bg-ink-100 lg:hidden"
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
                        "block rounded-field px-3 py-2.5 text-sm font-medium transition-colors",
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

              <div className="mt-4 flex flex-col gap-2 border-t border-ink-100 pt-4">
                <Link href="/login">
                  <Button tone="outline" block>
                    Log in
                  </Button>
                </Link>
                <Link href="/register">
                  <Button block>Create account</Button>
                </Link>
              </div>
            </nav>
          </Container>
        </div>
      )}
    </header>
  );
}
