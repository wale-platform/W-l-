"use client";

import type { ReactNode } from "react";
import { RoleLayout } from "@/components/app/RoleLayout";

export default function LawyerLayout({ children }: { children: ReactNode }) {
  return <RoleLayout role="lawyer">{children}</RoleLayout>;
}
