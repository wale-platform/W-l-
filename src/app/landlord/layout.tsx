"use client";

import { type ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  PlusCircle,
  Home,
  Calendar,
  LogOut,
  Bell,
  Menu,
  X,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Button, Avatar, toast } from "@/components/ui";

const navItems = [
  { href: "/landlord", label: "Dashboard", icon: LayoutDashboard },
  { href: "/landlord/upload-property", label: "Upload Property", icon: PlusCircle },
  { href: "/landlord/properties", label: "My Properties", icon: Home },
  { href: "/landlord/inspections", label: "Inspection Requests", icon: Calendar },
];

export default function LandlordLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [profile, setProfile] = useState<{ name: string; email: string; role: string } | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const loggedIn = localStorage.getItem("wale_is_logged_in") === "true";
      const role = localStorage.getItem("wale_role");
      const userStr = localStorage.getItem("wale_user");
      const user = userStr ? JSON.parse(userStr) : null;

      if (!loggedIn || !user || role !== "landlord") {
        setIsAuthenticated(false);
        router.push("/login");
      } else {
        setProfile(user);
        setIsAuthenticated(true);
      }
    }
  }, [router]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("wale_is_logged_in");
      localStorage.removeItem("wale_token");
      localStorage.removeItem("wale_user");
      localStorage.removeItem("wale_role");
    }
    toast.success("Logged out successfully");
    router.push("/login");
  };

  if (isAuthenticated === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-50/50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  if (isAuthenticated === false) {
    return null;
  }

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
                <Avatar name={profile.name || (profile as any).fullName || "Landlord"} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink-950">{profile.name || (profile as any).fullName || "Landlord"}</p>
                  <p className="truncate text-xs text-ink-500 uppercase font-bold tracking-wider">
                    {profile.role} dashboard
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
                    <Avatar name={profile.name || (profile as any).fullName || "Landlord"} size="sm" />
                    <div>
                      <p className="text-sm font-semibold text-ink-950">{profile.name || (profile as any).fullName || "Landlord"}</p>
                      <p className="text-xs text-ink-500 uppercase font-bold tracking-wider">
                        {profile.role} dashboard
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
