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

export default function LawyerPropertiesPage() {
  return (
    <main>
      <Section>
        <Container size="wide" className="flex flex-col gap-8">
          <SectionHeading
            eyebrow="Lawyer"
            title="Manage Listings"
            lead="Review and manage properties you have submitted on behalf of landlords."
          />

          <div className="flex justify-end">
            <Link href="/lawyer/properties/upload">
              <Button>Upload Property</Button>
            </Link>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Submitted Properties</CardTitle>
            </CardHeader>

            <CardBody className="flex flex-col items-center gap-4 py-16 text-center">
              <h3 className="text-lg font-semibold text-ink-900">
                No properties submitted yet
              </h3>

              <p className="max-w-md text-sm leading-6 text-ink-500">
                Properties you upload on behalf of landlords will appear here.
              </p>

              <Badge tone="neutral">No listings</Badge>
            </CardBody>
          </Card>
        </Container>
      </Section>
    </main>
  );
}