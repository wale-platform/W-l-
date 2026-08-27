import Link from "next/link";
import { Container, Section, SectionHeading } from "@/components/layout/Container";
import { Button, Card, CardBody, CardHeader, CardTitle } from "@/components/ui";
import { requireRole } from "@/lib/api/server-auth";

export default async function LandlordDashboard() {
  // Gates the render, not the data: the backend authorizes every API call
  // independently. Must be here rather than in the layout — a layout cannot stop
  // its page from rendering into the RSC payload. See lib/api/server-auth.ts.
  await requireRole(["LANDLORD", "ADMIN"]);

  return (
    <main id="main">
      <Section>
        <Container size="wide" className="flex flex-col gap-8">
          <SectionHeading
            eyebrow="Landlord dashboard"
            title="Welcome "
            lead="Manage your properties, listings, and inspection requests from one place."
          />

          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Total Properties</CardTitle>
              </CardHeader>

              <CardBody>
                <p className="text-3xl font-bold text-ink-900">0</p>
                <p className="mt-1 text-sm text-ink-500">
                  Properties uploaded
                </p>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pending Verification</CardTitle>
              </CardHeader>

              <CardBody>
                <p className="text-3xl font-bold text-ink-900">0</p>
                <p className="mt-1 text-sm text-ink-500">
                  Awaiting verification
                </p>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Approved Properties</CardTitle>
              </CardHeader>

              <CardBody>
                <p className="text-3xl font-bold text-ink-900">0</p>
                <p className="mt-1 text-sm text-ink-500">
                  Verified and approved
                </p>
              </CardBody>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Your Properties</CardTitle>
            </CardHeader>

            <CardBody className="flex flex-col items-center gap-4 py-12 text-center">
              <p className="text-ink-600">
                You haven&apos;t uploaded any properties yet.
              </p>
              <div className="flex gap-3">
              <Link href="/landlord/upload-property">
                  <Button>
                    Upload Property
                  </Button>
                </Link>
              <Link href="/landlord/properties">
                <Button tone="outline">
                  View My Properties
                </Button>
              </Link>
              <Link href="/landlord/inspections">
                  <Button tone="outline">
                    Inspection Requests
                  </Button>
                </Link>
              <Link href="/landlord/residences">
                  <Button tone="outline">
                    Residence Claims
                  </Button>
                </Link>
              </div>
            </CardBody>
          </Card>
        </Container>
      </Section>
    </main>
  );
}