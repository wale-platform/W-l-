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

export default function AdminInspectionsPage() {


  return (
    <main>
      <Section>
        <Container size="wide" className="flex flex-col gap-8">
          <SectionHeading
            eyebrow="Admin"
            title="Inspection Management"
            lead="Review and manage property inspection requests."
          />

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <CardTitle>Inspection Request</CardTitle>
              </div>
            </CardHeader>

            <CardBody className="flex flex-col items-center gap-4 py-16 text-center">
                    <h3 className="text-lg font-semibold text-ink-900">
                        No inspection requests yet
                    </h3>

                    <p className="max-w-md text-sm leading-6 text-ink-500">
                        Inspection requests will appear here when they are submitted.
                    </p>

                    <Badge tone="neutral">No data</Badge>
                    </CardBody>
          </Card>
        </Container>
      </Section>
    </main>
  );
}