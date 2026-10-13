"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Container, Section, SectionHeading } from "@/components/layout/Container";
import { Button, Card, CardBody, CardHeader, CardTitle, Badge } from "@/components/ui";
import { propertyApi } from "@/lib/api/property";
import { inspectionsApi } from "@/lib/api/inspections";
import { Plus, Home, Clock, CheckCircle, Calendar } from "lucide-react";

export default function LandlordDashboard() {
  // Fetch landlord properties
  const { data: propertiesData, isLoading: isPropsLoading } = useQuery({
    queryKey: ["landlordProperties"],
    queryFn: () => propertyApi.list({ source: "landlord" }),
  });

  // Fetch inspections
  const { data: inspectionsData, isLoading: isInspsLoading } = useQuery({
    queryKey: ["landlordInspections"],
    queryFn: () => inspectionsApi.listRequests(),
  });

  const properties = propertiesData?.properties || [];
  const totalProperties = properties.length;
  const pendingVerification = properties.filter((p) => !p.verified).length;
  const approvedProperties = properties.filter((p) => p.verified).length;

  const pendingInspections = inspectionsData?.filter((i) => i.status === "PENDING").length || 0;

  const isLoading = isPropsLoading || isInspsLoading;

  if (isLoading) {
    return (
      <main className="animate-pulse">
        <Section>
          <Container size="wide" className="flex flex-col gap-8">
            <div className="h-10 w-64 bg-ink-200 rounded" />
            <div className="grid gap-6 md:grid-cols-3">
              {[1, 2, 3].map((i) => (
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
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <SectionHeading
              eyebrow="Landlord dashboard"
              title="Welcome Back"
              lead="Manage your properties, listings, and inspection requests from one place."
            />
            <Link href="/landlord/upload-property">
              <Button className="flex items-center gap-2">
                <Plus className="size-4" /> Upload Property
              </Button>
            </Link>
          </div>

          <div className="grid gap-6 md:grid-cols-4">
            <Card>
              <CardBody className="flex items-center gap-4">
                <div className="p-3 bg-brand-50 text-brand-700 rounded-lg">
                  <Home className="size-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-ink-900">{totalProperties}</p>
                  <p className="text-xs text-ink-500 font-medium uppercase tracking-wider">Total Listings</p>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardBody className="flex items-center gap-4">
                <div className="p-3 bg-amber-50 text-amber-700 rounded-lg">
                  <Clock className="size-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-ink-900">{pendingVerification}</p>
                  <p className="text-xs text-ink-500 font-medium uppercase tracking-wider">Awaiting Verification</p>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardBody className="flex items-center gap-4">
                <div className="p-3 bg-emerald-50 text-emerald-700 rounded-lg">
                  <CheckCircle className="size-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-ink-900">{approvedProperties}</p>
                  <p className="text-xs text-ink-500 font-medium uppercase tracking-wider">Approved Listings</p>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardBody className="flex items-center gap-4">
                <div className="p-3 bg-blue-50 text-blue-700 rounded-lg">
                  <Calendar className="size-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-ink-900">{pendingInspections}</p>
                  <p className="text-xs text-ink-500 font-medium uppercase tracking-wider">Pending Inspections</p>
                </div>
              </CardBody>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader className="flex justify-between items-center">
                  <CardTitle>My Properties</CardTitle>
                  {totalProperties > 0 && (
                    <Link href="/landlord/properties">
                      <Button tone="ghost" size="sm">View all</Button>
                    </Link>
                  )}
                </CardHeader>
                <CardBody>
                  {totalProperties === 0 ? (
                    <div className="flex flex-col items-center gap-4 py-8 text-center">
                      <p className="text-ink-600">You haven't uploaded any properties yet.</p>
                      <Link href="/landlord/upload-property">
                        <Button tone="outline" size="sm">Upload Property</Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="divide-y divide-ink-100">
                      {properties.slice(0, 5).map((property) => (
                        <div key={property.id} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                          <div>
                            <p className="font-semibold text-ink-950">{property.title}</p>
                            <p className="text-sm text-ink-500">{property.address}, {property.city}</p>
                            <p className="text-sm font-semibold text-brand-700 mt-1">₦{property.price.toLocaleString()} / year</p>
                          </div>
                          <div>
                            {property.verified ? (
                              <Badge tone="success">Verified</Badge>
                            ) : (
                              <Badge tone="warning">Pending Verification</Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardBody>
              </Card>
            </div>

            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Quick Navigation</CardTitle>
                </CardHeader>
                <CardBody className="flex flex-col gap-3">
                  <Link href="/landlord/upload-property" className="w-full">
                    <Button block className="justify-start">➕ Upload New Property</Button>
                  </Link>
                  <Link href="/landlord/properties" className="w-full">
                    <Button block tone="outline" className="justify-start">🏠 Manage Listings</Button>
                  </Link>
                  <Link href="/landlord/inspections" className="w-full">
                    <Button block tone="outline" className="justify-start">📅 Inspection Requests ({pendingInspections})</Button>
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
