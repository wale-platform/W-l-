import Link from "next/link";

import {
  Container,
  Section,
  SectionHeading,
} from "@/components/layout/Container";

import {
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import { requireRole } from "@/lib/api/server-auth";

export default async function TenantDashboardPage() {
  // Gates the render, not the data: the backend authorizes every API call
  // independently. Must be here rather than in the layout — a layout cannot stop
  // its page from rendering into the RSC payload. See lib/api/server-auth.ts.
  await requireRole(["TENANT", "MOVER", "ADMIN"]);

  return (
    <main id="main">
      <Section>
        <Container size="wide" className="flex flex-col gap-8">
          <SectionHeading
            eyebrow="Outgoing Tenant Dashboard"
            title="Manage your apartment information"
            lead="Submit your apartment details and keep your move-out information up to date."
          />

          <div className="flex flex-wrap gap-3">
            <Link href="/tenant/inspections">
              <Button>My viewings</Button>
            </Link>

            <Link href="/tenant/residences">
              <Button tone="outline">Places I&apos;ve lived</Button>
            </Link>

            <Link href="/tenant/reviews">
              <Button tone="outline">My reviews</Button>
            </Link>

            <Link href="/properties">
              <Button tone="outline">Browse homes</Button>
            </Link>

            <Link href="/tenant/properties/upload">
              <Button tone="outline">Upload Apartment</Button>
            </Link>

            <Link href="/tenant/properties">
              <Button tone="outline">Manage Listing</Button>
            </Link>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Viewings</CardTitle>
              </CardHeader>
              <CardBody className="flex flex-col gap-3">
                <p className="text-sm text-ink-500">
                  Places you have asked to see, and what each landlord said back.
                </p>
                <Link href="/tenant/inspections" className="w-fit">
                  <Button size="sm" tone="outline">
                    See your viewings
                  </Button>
                </Link>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Places you&apos;ve lived</CardTitle>
              </CardHeader>
              <CardBody className="flex flex-col gap-3">
                <p className="text-sm text-ink-500">
                  Record a place you rented. Once its landlord confirms you lived
                  there, you can review it — and your rating counts towards what
                  other students see.
                </p>
                <Link href="/tenant/residences" className="w-fit">
                  <Button size="sm" tone="outline">
                    Your residence history
                  </Button>
                </Link>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Your reviews</CardTitle>
              </CardHeader>
              <CardBody className="flex flex-col gap-3">
                <p className="text-sm text-ink-500">
                  What you have written about places you lived, and the only place to
                  revise it. Readers only ever see your first name and last initial.
                </p>
                <Link href="/tenant/reviews" className="w-fit">
                  <Button size="sm" tone="outline">
                    Your reviews
                  </Button>
                </Link>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Apartment</CardTitle>
              </CardHeader>
              <CardBody>
                <p className="text-sm text-ink-500">
                  Upload and manage your current apartment information.
                </p>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Move-out Date</CardTitle>
              </CardHeader>
              <CardBody>
                <p className="text-sm text-ink-500">
                  Update your expected move-out date.
                </p>
              </CardBody>
            </Card>
          </div>
        </Container>
      </Section>
    </main>
  );
}