"use client";

import type { ReactNode } from "react";
import { AppShell } from "@/components/app/AppShell";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { useSession } from "@/lib/auth/client-session";

/**
 * Frame for public pages. Signed-in users keep the app sidebar and header
 * everywhere (browsing homes, the map, About…); visitors get the marketing
 * navbar. The page itself is the same either way.
 */
export function SiteChrome({
  children,
  marketingOnly = false,
}: {
  children: ReactNode;
  /** Always use the public navbar, even when signed in (the home page). */
  marketingOnly?: boolean;
}) {
  const { data: user } = useSession();

  if (user && !marketingOnly) {
    return (
      <AppShell user={user} padded={false} footer={<Footer />}>
        {children}
      </AppShell>
    );
  }

  return (
    <>
      <Navbar />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer />
    </>
  );
}
