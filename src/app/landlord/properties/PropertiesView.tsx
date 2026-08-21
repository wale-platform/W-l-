"use client";

import { useState } from "react";
import Link from "next/link";
import { PropertyCard } from "@/components/ui/PropertyCard";
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
} from "@/components/ui";

export default function LandlordPropertiesPage() {
  const [showProperty, setShowProperty] = useState(true);
  return (
    <main>
      <Section>
        <Container
          size="wide"
          className="flex flex-col gap-8"
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <SectionHeading
              eyebrow="Properties"
              title="My Properties"
              lead="View and manage the properties you have submitted to WALE."
            />
            </div>

          <Card>
            <CardHeader>
              <CardTitle>Your property listings</CardTitle>
            </CardHeader>

            <CardBody className="flex flex-col items-center gap-4 py-16 text-center">
              <div className="flex size-16 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                <span className="text-2xl">🏠</span>
              </div>

              <div className="flex flex-col gap-2">
                <h3 className="text-lg font-semibold text-ink-900">
                  No properties yet
                </h3>

                <p className="max-w-md text-sm leading-6 text-ink-500">
                  You haven&apos;t uploaded any properties yet. Add your first
                  property to start reaching students on WALE.
                </p>
              </div>

              <Link href="/landlord/upload-property">
                <Button>
                  Upload Your First Property
                </Button>
              </Link>
            </CardBody>
          </Card>
        </Container>
      </Section>
    </main>
  );
}