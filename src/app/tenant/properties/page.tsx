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

export default function TenantPropertiesPage() {
  return (
    <main>
      <Section>
        <Container size="wide" className="flex flex-col gap-8">
          <SectionHeading
            eyebrow="Outgoing Tenant"
            title="Manage Apartment Information"
            lead="Review and update the apartment information you submitted."
          />

          <div className="flex justify-end">
            <Link href="/tenant/properties/upload">
              <Button>Upload Apartment</Button>
            </Link>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>My Apartment</CardTitle>
            </CardHeader>

            <CardBody className="flex flex-col items-center gap-4 py-16 text-center">
              <h3 className="text-lg font-semibold text-ink-900">
                No apartment submitted yet
              </h3>

              <p className="max-w-md text-sm leading-6 text-ink-500">
                Your submitted apartment information will appear here.
              </p>

              <Badge tone="neutral">No listing</Badge>
            </CardBody>
          </Card>
        </Container>
      </Section>
    </main>
  );
}