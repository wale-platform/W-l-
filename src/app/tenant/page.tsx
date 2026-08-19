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
  Badge,
} from "@/components/ui";

export default function TenantDashboardPage() {
  return (
    <main>
      <Section>
        <Container size="wide" className="flex flex-col gap-8">
          <SectionHeading
            eyebrow="Outgoing Tenant Dashboard"
            title="Manage your apartment information"
            lead="Submit your apartment details and keep your move-out information up to date."
          />

          <div className="flex flex-wrap gap-3">
            <Link href="/tenant/properties/upload">
              <Button>Upload Apartment</Button>
            </Link>

            <Link href="/tenant/properties">
              <Button tone="outline">Manage Listing</Button>
            </Link>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
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
                <CardTitle>Verification</CardTitle>
              </CardHeader>
              <CardBody>
                <Badge tone="warning">Pending verification</Badge>
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
