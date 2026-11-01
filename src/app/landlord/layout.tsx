"use client";

import type { ReactNode } from "react";
import { RoleLayout } from "@/components/app/RoleLayout";

export default function LandlordLayout({ children }: { children: ReactNode }) {
  return <RoleLayout role="landlord">{children}</RoleLayout>;
}
