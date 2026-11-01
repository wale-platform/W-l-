"use client";

import type { ReactNode } from "react";
import { SignedInLayout } from "@/components/app/RoleLayout";

export default function Layout({ children }: { children: ReactNode }) {
  return <SignedInLayout>{children}</SignedInLayout>;
}
