"use client";

import type { ReactNode } from "react";
import { RoleLayout } from "@/components/app/RoleLayout";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <RoleLayout role="admin">{children}</RoleLayout>;
}
