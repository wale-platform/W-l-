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

export default function LawyerDashboardPage() {
  return (
    <main>
      <Section>
        <Container size="wide" className="flex flex-col gap-8">
          <SectionHeading
            eyebrow="Lawyer Dashboard"
            title="Manage your property verification work"
            lead="Upload and manage properties on behalf of landlords and track their verification status."
          />

          <div className="flex flex-wrap gap-3">
            <Link href="/lawyer/properties/upload">
              <Button>Upload Property</Button>
            </Link>

            <Link href="/lawyer/properties">
              <Button tone="outline">Manage Listings</Button>
            </Link>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Properties</CardTitle>
              </CardHeader>
              <CardBody>
                <p className="text-sm text-ink-500">
                  Manage properties submitted on behalf of landlords.
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
                <CardTitle>Listings</CardTitle>
              </CardHeader>
              <CardBody>
                <p className="text-sm text-ink-500">
                  Review and edit your submitted listings.
                </p>
              </CardBody>
            </Card>
          </div>
        </Container>
      </Section>
    </main>
  );
}