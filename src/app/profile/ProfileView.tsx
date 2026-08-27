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

export default function ProfilePage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    console.log({
      name,
      email,
      phone,
    });
  };

  return (
    <main id="main">
      <Section>
        <Container size="narrow" className="flex flex-col gap-8">
          <SectionHeading
            eyebrow="Profile"
            title="Provider Profile"
            lead="View and update your profile and contact information."
          />

          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
            </CardHeader>

            <CardBody>
              <form
                onSubmit={handleSubmit}
                className="flex flex-col gap-5"
              >
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="name"
                    className="text-sm font-medium text-ink-800"
                  >
                    Name
                  </label>

                  <input
                    id="name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="h-11 rounded-field border border-ink-200 px-4 text-sm"
                    placeholder="Enter your name"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="email"
                    className="text-sm font-medium text-ink-800"
                  >
                    Email
                  </label>

                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="h-11 rounded-field border border-ink-200 px-4 text-sm"
                    placeholder="Enter your email"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="phone"
                    className="text-sm font-medium text-ink-800"
                  >
                    Phone Number
                  </label>

                  <input
                    id="phone"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    className="h-11 rounded-field border border-ink-200 px-4 text-sm"
                    placeholder="Enter your phone number"
                  />
                </div>

                <Button type="submit">
                  Save Changes
                </Button>
              </form>
            </CardBody>
          </Card>
        </Container>
      </Section>
    </main>
  );
}