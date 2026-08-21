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

export default function LawyerUploadPropertyPage() {
  const [propertyName, setPropertyName] = useState("");
  const [landlordName, setLandlordName] = useState("");
  const [price, setPrice] = useState("");
  const [location, setLocation] = useState("");

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    console.log({
      propertyName,
      landlordName,
      price: Number(price),
      location,
    });
  };

  return (
    <main>
      <Section>
        <Container size="narrow" className="flex flex-col gap-8">
          <SectionHeading
            eyebrow="Lawyer"
            title="Upload Property"
            lead="Submit a property on behalf of a landlord."
          />

          <Card>
            <CardHeader>
              <CardTitle>Property Information</CardTitle>
            </CardHeader>

            <CardBody>
              <form
                onSubmit={handleSubmit}
                className="flex flex-col gap-5"
              >
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="propertyName"
                    className="text-sm font-medium text-ink-800"
                  >
                    Property Name
                  </label>

                  <input
                    id="propertyName"
                    value={propertyName}
                    onChange={(event) =>
                      setPropertyName(event.target.value)
                    }
                    className="h-11 rounded-field border border-ink-200 px-4 text-sm"
                    placeholder="Enter property name"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="landlordName"
                    className="text-sm font-medium text-ink-800"
                  >
                    Landlord Name
                  </label>

                  <input
                    id="landlordName"
                    value={landlordName}
                    onChange={(event) =>
                      setLandlordName(event.target.value)
                    }
                    className="h-11 rounded-field border border-ink-200 px-4 text-sm"
                    placeholder="Enter landlord name"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="price"
                    className="text-sm font-medium text-ink-800"
                  >
                    Price
                  </label>

                  <input
                    id="price"
                    type="number"
                    value={price}
                    onChange={(event) => setPrice(event.target.value)}
                    className="h-11 rounded-field border border-ink-200 px-4 text-sm"
                    placeholder="Enter price"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="location"
                    className="text-sm font-medium text-ink-800"
                  >
                    Location
                  </label>

                  <input
                    id="location"
                    value={location}
                    onChange={(event) =>
                      setLocation(event.target.value)
                    }
                    className="h-11 rounded-field border border-ink-200 px-4 text-sm"
                    placeholder="Enter location"
                  />
                </div>

                <Button type="submit">
                  Submit Property
                </Button>
              </form>
            </CardBody>
          </Card>
        </Container>
      </Section>
    </main>
  );
}