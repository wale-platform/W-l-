import {
  Container,
  Section,
  SectionHeading,
} from "@/components/layout/Container";

import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Badge,
} from "@/components/ui";

export default function AdminVerificationPage() {
  return (
    <main>
      <Section>
        <Container size="wide" className="flex flex-col gap-8">
          <SectionHeading
            eyebrow="Admin"
            title="Verify Properties"
            lead="Review pending properties and manage verification."
          />

          <Card>
            <CardHeader>
              <CardTitle>Pending Verification</CardTitle>
            </CardHeader>

            <CardBody className="flex flex-col items-center gap-4 py-16 text-center">
              <h3 className="text-lg font-semibold text-ink-900">
                No properties awaiting verification
              </h3>

              <p className="max-w-md text-sm leading-6 text-ink-500">
                Properties submitted for verification will appear here.
              </p>

              <Badge tone="neutral">No data</Badge>
            </CardBody>
          </Card>
        </Container>
      </Section>
    </main>
  );
}