"use client";

import type { ReactNode } from "react";
import { RoleLayout } from "@/components/app/RoleLayout";

export default function StudentLayout({ children }: { children: ReactNode }) {
  return <RoleLayout role="student">{children}</RoleLayout>;
}
