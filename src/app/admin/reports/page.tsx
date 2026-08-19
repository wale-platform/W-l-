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

export default function AdminReportsPage() {
  return (
    <main>
      <Section>
        <Container size="wide" className="flex flex-col gap-8">
          <SectionHeading
            eyebrow="Admin"
            title="View Reports"
            lead="Review reports submitted by platform users."
          />

          <Card>
            <CardHeader>
              <CardTitle>Reports</CardTitle>
            </CardHeader>

            <CardBody className="flex flex-col items-center gap-4 py-16 text-center">
              <h3 className="text-lg font-semibold text-ink-900">
                No reports to review
              </h3>

              <p className="max-w-md text-sm leading-6 text-ink-500">
                User reports will appear here when they are submitted.
              </p>

              <Badge tone="neutral">No data</Badge>
            </CardBody>
          </Card>
        </Container>
      </Section>
    </main>
  );
}