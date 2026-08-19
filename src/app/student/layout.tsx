"use client";

import { type ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Compass,
  UserCircle2,
  LogOut,
  Bell,
  Menu,
  X,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { usersApi } from "@/lib/api/users";
import { Button, Avatar, toast } from "@/components/ui";

const navItems = [
  { href: "/student", label: "Dashboard", icon: LayoutDashboard },
  { href: "/properties", label: "Browse Hostels", icon: Compass },
  { href: "/student/profile", label: "My Profile", icon: UserCircle2 },
];

export default function StudentLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Fetch the student profile
  const { data: profile } = useQuery({
    queryKey: ["studentProfile"],
    queryFn: usersApi.getProfile,
  });

  // Close mobile menu on pathname change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    toast.success("Logged out successfully");
    router.push("/login");
  };

  return (
    <div className="flex min-h-screen bg-ink-50/50">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 border-r border-ink-200 bg-white lg:block shrink-0">
        <div className="flex h-16 items-center border-b border-ink-150 px-6">
          <Link href="/" aria-label="WALE Housing home">
            <Logo />
          </Link>
        </div>

        <div className="flex h-[calc(100vh-4rem)] flex-col justify-between p-4">
          <nav className="space-y-1" aria-label="Sidebar navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-field px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-brand-50 text-brand-800"
                      : "text-ink-600 hover:bg-ink-50 hover:text-ink-900"
                  }`}
                >
                  <Icon className="size-4 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-ink-150 pt-4 space-y-4">
            {profile && (
              <div className="flex items-center gap-3 px-2">
                <Avatar name={profile.name} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink-950">{profile.name}</p>
                  <p className="truncate text-xs text-ink-500 uppercase font-bold tracking-wider">
                    {profile.university} student
                  </p>
                </div>
              </div>
            )}

            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-field px-3 py-2 text-sm font-medium text-danger hover:bg-danger-subtle transition-colors"
            >
              <LogOut className="size-4 shrink-0" />
              Log out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Column */}
      <div className="flex flex-1 flex-col">
        {/* Mobile Header */}
        <header className="flex h-16 items-center justify-between border-b border-ink-200 bg-white px-4 lg:hidden">
          <Link href="/" aria-label="WALE Housing home">
            <Logo />
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-field p-1.5 text-ink-500 hover:bg-ink-50 hover:text-ink-900"
              aria-label="View notifications"
            >
              <Bell className="size-5" />
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="rounded-field p-1.5 text-ink-500 hover:bg-ink-50 hover:text-ink-900"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="size-6" /> : <Menu className="size-6" />}
            </button>
          </div>
        </header>

        {/* Mobile Drawer menu */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 lg:hidden bg-ink-950/40 backdrop-blur-sm pt-16">
            <div className="w-full bg-white p-4 space-y-4 shadow-lifted">
              <nav className="flex flex-col gap-1" aria-label="Mobile navigation">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 rounded-field px-4 py-3 text-sm font-semibold transition-colors ${
                        isActive
                          ? "bg-brand-50 text-brand-800"
                          : "text-ink-600 hover:bg-ink-50 hover:text-ink-900"
                      }`}
                    >
                      <Icon className="size-4 shrink-0" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>

              <div className="border-t border-ink-150 pt-4 flex items-center justify-between">
                {profile && (
                  <div className="flex items-center gap-3">
                    <Avatar name={profile.name} size="sm" />
                    <div>
                      <p className="text-sm font-semibold text-ink-950">{profile.name}</p>
                      <p className="text-xs text-ink-500 uppercase font-bold tracking-wider">
                        {profile.university} student
                      </p>
                    </div>
                  </div>
                )}

                <Button tone="outline" size="sm" onClick={handleLogout} className="text-danger border-danger/25 hover:bg-danger-subtle">
                  <LogOut className="size-3.5" />
                  Logout
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Page Content viewport */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
