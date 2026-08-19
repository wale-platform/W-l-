"use client";

import { useState } from "react";
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

export default function InspectionsPage() {
  const [requestStatus, setRequestStatus] = useState<
    "pending" | "accepted" | "rejected"
  >("pending");
  return (
    <main>
      <Section>
        <Container
          size="wide"
          className="flex flex-col gap-8"
        >
          <SectionHeading
            eyebrow="Inspections"
            title="Inspection Requests"
            lead="View and manage requests from students interested in your properties."
          />

          <Card>
            <CardHeader>
              <CardTitle>Inspection requests</CardTitle>
            </CardHeader>

            <CardBody className="flex flex-col items-center gap-4 py-16 text-center">
              <div className="flex size-16 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                <span className="text-2xl">📅</span>
              </div>

              <div className="flex flex-col gap-2">
                <h3 className="text-lg font-semibold text-ink-900">
                  No inspection requests yet
                </h3>

                <p className="max-w-md text-sm leading-6 text-ink-500">
                  Inspection requests from students will appear here when
                  someone wants to view one of your properties.
                </p>
              </div>

              <Badge tone="neutral">
                No requests
              </Badge>
            </CardBody>
          </Card>
        </Container>
      </Section>
    </main>
  );
} 