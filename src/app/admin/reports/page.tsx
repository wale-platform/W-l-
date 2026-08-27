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
import { requireRole } from "@/lib/api/server-auth";

export default async function AdminReportsPage() {
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