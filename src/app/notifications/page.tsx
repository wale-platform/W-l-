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

export default function NotificationsPage() {
  return (
    <main>
      <Section>
        <Container size="wide" className="flex flex-col gap-8">
          <SectionHeading
            eyebrow="Notifications"
            title="Notification Center"
            lead="Stay updated on your properties, verification requests, and inspections."
          />

          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
            </CardHeader>

            <CardBody className="flex flex-col items-center gap-4 py-16 text-center">
              <h3 className="text-lg font-semibold text-ink-900">
                No notifications yet
              </h3>

              <p className="max-w-md text-sm leading-6 text-ink-500">
                Verification updates, inspection updates, and other
                notifications will appear here.
              </p>

              <Badge tone="neutral">All caught up</Badge>
            </CardBody>
          </Card>
        </Container>
      </Section>
    </main>
  );
}