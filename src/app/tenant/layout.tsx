"use client";

import type { ReactNode } from "react";
import { RoleLayout } from "@/components/app/RoleLayout";

export default function TenantLayout({ children }: { children: ReactNode }) {
  return <RoleLayout role="tenant">{children}</RoleLayout>;
}
