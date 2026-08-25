import Link from "next/link";
import {
  CalendarClock,
  ClipboardCheck,
  Flag,
  Home,
  Users,
  type LucideIcon,
} from "lucide-react";

import {
  Container,
  Section,
  SectionHeading,
} from "@/components/layout/Container";
import { Badge, Card, CardBody, CardHeader, CardTitle } from "@/components/ui";
import { requireRole } from "@/lib/api/server-auth";

/**
 * The admin landing page — a way in to each area.
 *
 * It exists because the pages under `/admin` were previously reachable only by
 * typing the URL. Cards say plainly which ones are wired to real data and which
 * are still placeholders, because an admin console that looks complete and
 * silently shows nothing is worse than one that admits what is missing.
 *
 * No counts. Numbers here would need an endpoint that does not exist yet, and a
 * hardcoded "0" next to a queue that has three things in it is a lie the UI tells
 * on the server's behalf.
 */

type Area = {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
  ready: boolean;
};

const AREAS: Area[] = [
  {
    href: "/admin/verification",
    title: "Review listings",
    description:
      "Approve, reject, or suspend listings. What you write when you reject one is what the landlord reads.",
    icon: ClipboardCheck,
    ready: true,
  },
  {
    href: "/admin/inspections",
    title: "Viewing requests",
    description:
      "Every request across the platform, soonest first. You can answer one as the landlord would.",
    icon: CalendarClock,
    ready: true,
  },
  {
    href: "/admin/listings",
    title: "All listings",
    description: "Not wired up yet — use Review listings, which reads the real queue.",
    icon: Home,
    ready: false,
  },
  {
    href: "/admin/users",
    title: "Users",
    description:
      "Not wired up yet. There is no user-listing endpoint on the API for this to read.",
    icon: Users,
    ready: false,
  },
  {
    href: "/admin/reports",
    title: "Reports",
    description: "Not wired up yet.",
    icon: Flag,
    ready: false,
  },
];

export default async function AdminDashboardPage() {
  // Gates the render, not the data: the backend authorizes every API call
  // independently. Must be here rather than in the layout — a layout cannot stop
  // its page from rendering into the RSC payload. See lib/api/server-auth.ts.
  await requireRole(["ADMIN"]);

  return (
    <main id="main">
      <Section>
        <Container size="wide" className="flex flex-col gap-8">
          <SectionHeading
            eyebrow="Admin"
            title="Console"
            lead="Everything an administrator can do, and what is not built yet."
            align="left"
          />

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {AREAS.map(({ href, title, description, icon: Icon, ready }) => (
              <Link key={href} href={href} className="group">
                {/* `interactive` is the card's own hover treatment — a bespoke
                    shadow class here would resolve to nothing under Tailwind v4,
                    which only generates utilities backed by a theme token. */}
                <Card interactive className="h-full">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <CardTitle className="flex items-center gap-2">
                        <Icon aria-hidden="true" className="size-4 shrink-0 text-ink-400" />
                        {title}
                      </CardTitle>
                      {!ready && <Badge tone="neutral">Placeholder</Badge>}
                    </div>
                  </CardHeader>
                  <CardBody>
                    <p className="text-sm leading-6 text-ink-500">{description}</p>
                  </CardBody>
                </Card>
              </Link>
            ))}
          </div>
        </Container>
      </Section>
    </main>
  );
}
