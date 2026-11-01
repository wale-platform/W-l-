import {
  Activity,
  AlertTriangle,
  Banknote,
  CreditCard,
  Bell,
  Calendar,
  CalendarCheck,
  Compass,
  FolderLock,
  Home,
  Key,
  LayoutDashboard,
  MapPin,
  PlusCircle,
  Settings,
  ShieldCheck,
  Sparkles,
  UserCircle2,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { AuthRole } from "@/lib/api/schemas";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}

const roleItems: Record<AuthRole, NavItem[]> = {
  student: [
    { href: "/student", label: "Dashboard", icon: LayoutDashboard },
    { href: "/student/profile", label: "My Profile", icon: UserCircle2 },
  ],
  landlord: [
    { href: "/landlord", label: "Dashboard", icon: LayoutDashboard },
    { href: "/landlord/upload-property", label: "Upload Property", icon: PlusCircle },
    { href: "/landlord/properties", label: "My Properties", icon: Home },
    { href: "/landlord/inspections", label: "Inspection Requests", icon: Calendar },
  ],
  lawyer: [
    { href: "/lawyer", label: "Dashboard", icon: LayoutDashboard },
    { href: "/lawyer/properties/upload", label: "Upload Property", icon: PlusCircle },
    { href: "/lawyer/properties", label: "Manage Listings", icon: FolderLock },
  ],
  tenant: [
    { href: "/tenant", label: "Dashboard", icon: LayoutDashboard },
    { href: "/tenant/properties/upload", label: "Upload Handover", icon: PlusCircle },
    { href: "/tenant/properties", label: "Manage Listings", icon: Key },
  ],
  admin: [
    { href: "/admin", label: "Overview", icon: LayoutDashboard },
    { href: "/admin/users", label: "Users", icon: Users },
    { href: "/admin/listings", label: "Listings", icon: Home },
    { href: "/admin/verification", label: "Verify Pending", icon: ShieldCheck },
    { href: "/admin/inspections", label: "Appointments", icon: CalendarCheck },
    { href: "/admin/payments", label: "Payments", icon: CreditCard },
    { href: "/admin/payouts", label: "Payouts", icon: Banknote },
    { href: "/admin/activity", label: "Activity", icon: Activity },
    { href: "/admin/reports", label: "User Reports", icon: AlertTriangle },
  ],
};

/** Sidebar sections for a signed-in user: their workspace, then shared pages. */
export function navigationFor(role: AuthRole): NavSection[] {
  const explore: NavItem[] = [
    { href: "/properties", label: "Browse Homes", icon: Compass },
    { href: "/map", label: "Map Search", icon: MapPin },
  ];
  if (role === "student") explore.push({ href: "/match", label: "AI Match", icon: Sparkles });

  const account: NavItem[] = [
    ...(role === "admin" ? [] : [{ href: "/wallet", label: "Wallet", icon: Wallet }]),
    { href: "/notifications", label: "Notifications", icon: Bell },
    { href: "/account", label: "Account Settings", icon: Settings },
  ];

  return [
    { items: roleItems[role] },
    { title: "Explore", items: explore },
    { title: "Account", items: account },
  ];
}

/** The most specific nav item matching the current path. */
export function activeHref(sections: NavSection[], pathname: string): string | null {
  let best: string | null = null;
  for (const { items } of sections) {
    for (const { href } of items) {
      const matches = pathname === href || pathname.startsWith(`${href}/`);
      if (matches && (!best || href.length > best.length)) best = href;
    }
  }
  return best;
}
