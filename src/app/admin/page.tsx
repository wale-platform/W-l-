"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Container, Section, SectionHeading } from "@/components/layout/Container";
import { Button, Card, CardBody, CardHeader, CardTitle, Badge } from "@/components/ui";
import { propertyApi } from "@/lib/api/property";
import { Home, Users, CheckSquare, ShieldAlert, ArrowRight } from "lucide-react";

export default function AdminDashboardPage() {
  // Fetch all properties (both verified and unverified)
  const { data: propertiesData, isLoading } = useQuery({
    queryKey: ["adminAllProperties"],
    queryFn: () => propertyApi.list({}),
  });

  const [userCount, setUserCount] = useState(24);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("wale_mock_registered_users");
      if (stored) {
        try {
          const list = JSON.parse(stored);
          setUserCount(list.length);
        } catch (e) {}
      }
    }
  }, []);

  const properties = propertiesData?.properties || [];
  const totalListings = propertiesData?.total || 0;
  const pendingVerification = properties.filter((p) => !p.verified).length;
  const activeListings = properties.filter((p) => p.verified).length;

  if (isLoading) {
    return (
      <main className="animate-pulse">
        <Section>
          <Container size="wide" className="flex flex-col gap-8">
            <div className="h-10 w-64 bg-ink-200 rounded" />
            <div className="grid gap-6 md:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-28 bg-ink-200 rounded-card" />
              ))}
            </div>
            <div className="h-64 bg-ink-200 rounded-card" />
          </Container>
        </Section>
      </main>
    );
  }

  return (
    <main>
      <Section>
        <Container size="wide" className="flex flex-col gap-8">
          <SectionHeading
            eyebrow="Admin Dashboard"
            title="WALE Platform Administration"
            lead="Oversee listings, verify properties, manage users, and review platform feedback."
          />

          {/* Stats Grid */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardBody className="flex items-center gap-4">
                <div className="p-3 bg-brand-50 text-brand-700 rounded-lg">
                  <Home className="size-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-ink-900">{totalListings}</p>
                  <p className="text-xs text-ink-500 font-medium uppercase tracking-wider">Total Listings</p>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardBody className="flex items-center gap-4">
                <div className="p-3 bg-amber-50 text-amber-700 rounded-lg">
                  <ShieldAlert className="size-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-ink-900">{pendingVerification}</p>
                  <p className="text-xs text-ink-500 font-medium uppercase tracking-wider font-display">Awaiting Review</p>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardBody className="flex items-center gap-4">
                <div className="p-3 bg-emerald-50 text-emerald-700 rounded-lg">
                  <CheckSquare className="size-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-ink-900">{activeListings}</p>
                  <p className="text-xs text-ink-500 font-medium uppercase tracking-wider">Verified Listings</p>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardBody className="flex items-center gap-4">
                <div className="p-3 bg-blue-50 text-blue-700 rounded-lg">
                  <Users className="size-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-ink-900">{userCount}</p>
                  <p className="text-xs text-ink-500 font-medium uppercase tracking-wider">Registered Users</p>
                </div>
              </CardBody>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Recent Listings */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              <Card>
                <CardHeader className="flex justify-between items-center">
                  <CardTitle>Recent Listing Submissions</CardTitle>
                  <Link href="/admin/listings" className="text-sm font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1">
                    Manage all <ArrowRight className="size-4" />
                  </Link>
                </CardHeader>
                <CardBody>
                  {properties.length === 0 ? (
                    <p className="text-sm text-ink-500 text-center py-6">No listing submissions found.</p>
                  ) : (
                    <div className="divide-y divide-ink-100">
                      {properties.slice(0, 5).map((property) => (
                        <div key={property.id} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                          <div>
                            <p className="font-semibold text-ink-950">{property.title}</p>
                            <p className="text-xs text-ink-500 font-medium mt-0.5">
                              Source: <span className="uppercase text-brand-700">{property.source}</span> | {property.city}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            {property.verified ? (
                              <Badge tone="success">Verified</Badge>
                            ) : (
                              <Badge tone="warning">Pending Review</Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardBody>
              </Card>
            </div>

            {/* Quick Links / Actions */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Administrative Actions</CardTitle>
                </CardHeader>
                <CardBody className="flex flex-col gap-3">
                  <Link href="/admin/verification" className="w-full">
                    <Button block className="justify-start gap-2">
                      <ShieldAlert className="size-4" /> Verify Pending ({pendingVerification})
                    </Button>
                  </Link>
                  <Link href="/admin/listings" className="w-full">
                    <Button block tone="outline" className="justify-start gap-2">
                      <Home className="size-4" /> View All Listings
                    </Button>
                  </Link>
                  <Link href="/admin/users" className="w-full">
                    <Button block tone="outline" className="justify-start gap-2">
                      <Users className="size-4" /> View User Accounts
                    </Button>
                  </Link>
                </CardBody>
              </Card>
            </div>
          </div>
        </Container>
      </Section>
    </main>
  );
}
