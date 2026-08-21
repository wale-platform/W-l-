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
} from "@/components/ui";

export default function UploadApartmentPage() {
  const [address, setAddress] = useState("");
  const [apartmentType, setApartmentType] = useState("");
  const [moveOutDate, setMoveOutDate] = useState("");

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    console.log({
      address,
      apartmentType,
      moveOutDate,
    });
  };

  return (
    <main>
      <Section>
        <Container size="narrow" className="flex flex-col gap-8">
          <SectionHeading
            eyebrow="Outgoing Tenant"
            title="Upload Apartment Information"
            lead="Submit the details of the apartment you are moving out of."
          />

          <Card>
            <CardHeader>
              <CardTitle>Apartment Information</CardTitle>
            </CardHeader>

            <CardBody>
              <form
                onSubmit={handleSubmit}
                className="flex flex-col gap-5"
              >
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="address"
                    className="text-sm font-medium text-ink-800"
                  >
                    Apartment Address
                  </label>

                  <input
                    id="address"
                    value={address}
                    onChange={(event) =>
                      setAddress(event.target.value)
                    }
                    className="h-11 rounded-field border border-ink-200 px-4 text-sm"
                    placeholder="Enter apartment address"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="apartmentType"
                    className="text-sm font-medium text-ink-800"
                  >
                    Apartment Type
                  </label>

                  <input
                    id="apartmentType"
                    value={apartmentType}
                    onChange={(event) =>
                      setApartmentType(event.target.value)
                    }
                    className="h-11 rounded-field border border-ink-200 px-4 text-sm"
                    placeholder="e.g. 2 Bedroom Flat"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="moveOutDate"
                    className="text-sm font-medium text-ink-800"
                  >
                    Move-out Date
                  </label>

                  <input
                    id="moveOutDate"
                    type="date"
                    value={moveOutDate}
                    onChange={(event) =>
                      setMoveOutDate(event.target.value)
                    }
                    className="h-11 rounded-field border border-ink-200 px-4 text-sm"
                  />
                </div>

                <Button type="submit">
                  Submit Apartment
                </Button>
              </form>
            </CardBody>
          </Card>
        </Container>
      </Section>
    </main>
  );
}