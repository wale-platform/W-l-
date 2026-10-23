"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Container, Section, SectionHeading } from "@/components/layout/Container";
import { Button, Card, CardBody, CardHeader, CardTitle, Badge, Alert } from "@/components/ui";
import { propertyApi } from "@/lib/api/property";
import { inspectionsApi } from "@/lib/api/inspections";
import { reportsApi } from "@/lib/api/reports";
import { DEFAULT_USERS } from "@/lib/api/auth";
import { Home, Users, CheckSquare, ShieldAlert, ArrowRight, CalendarCheck, Flag, MailPlus } from "lucide-react";

export default function AdminDashboardPage() {
  const { data: propertiesData, isLoading, isError: listingsError } = useQuery({
    queryKey: ["adminAllProperties"],
    queryFn: () => propertyApi.list({}),
  });
  const { data: inspections = [], isLoading: inspectionsLoading, isError: inspectionsError } = useQuery({
    queryKey: ["adminInspections"],
    queryFn: () => inspectionsApi.listRequests(),
  });
  const { data: reports = [], isLoading: reportsLoading, isError: reportsError } = useQuery({
    queryKey: ["adminReports"],
    queryFn: () => reportsApi.listReports(),
  });

  const {
    data: users = [],
    isLoading: usersLoading,
    isError: usersError,
  } = useQuery({
    queryKey: ["adminUsers"],
    queryFn: () => {
      const stored = localStorage.getItem("wale_mock_registered_users");
      if (!stored) {
        localStorage.setItem("wale_mock_registered_users", JSON.stringify(DEFAULT_USERS));
        return DEFAULT_USERS;
      }
      const savedUsers: unknown = JSON.parse(stored);
      if (!Array.isArray(savedUsers)) throw new Error("Saved user data is not a list.");
      return savedUsers as typeof DEFAULT_USERS;
    },
  });

  const properties = propertiesData?.properties || [];
  const totalListings = propertiesData?.total || 0;
  const pendingVerification = properties.filter((p) => !p.verified).length;
  const activeListings = properties.filter((p) => p.verified).length;
  const pendingInspections = inspections.filter((request) => request.status === "PENDING").length;
  const openReports = reports.filter((report) => report.status === "OPEN").length;

  if (
    isLoading ||
    inspectionsLoading ||
    reportsLoading ||
    usersLoading
  ) {
    return (
      <main className="animate-pulse">
        <Section>
          <Container size="wide" className="flex flex-col gap-8">
            <div className="h-10 w-72 bg-ink-200 rounded" />
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-5">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-28 bg-ink-200 rounded-card" />
              ))}
            </div>
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="h-64 bg-ink-200 rounded-card lg:col-span-2" />
              <div className="h-64 bg-ink-200 rounded-card" />
            </div>
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
            lead="A single place to review listings, manage users and inspections, and respond to reports."
          />

          {(listingsError || inspectionsError || reportsError || usersError) && (
            <Alert tone="danger" title="Some dashboard data could not be loaded">
              Refresh the page to retry loading the affected data.
            </Alert>
          )}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
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
                  <p className="text-2xl font-bold text-ink-900">{usersError ? "—" : users.length}</p>
                  <p className="text-xs text-ink-500 font-medium uppercase tracking-wider">Registered Users</p>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardBody className="flex items-center gap-4">
                <div className="p-3 bg-violet-50 text-violet-700 rounded-lg">
                  <CalendarCheck className="size-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-ink-900">{pendingInspections}</p>
                  <p className="text-xs text-ink-500 font-medium uppercase tracking-wider">Pending Inspections</p>
                </div>
              </CardBody>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 flex flex-col gap-6">
              {listingsError && (
                <Alert tone="danger" title="Listings could not be loaded">
                  Refresh the page to retry loading the listing overview.
                </Alert>
              )}
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

              <Card>
                <CardHeader className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <CalendarCheck className="size-5 text-brand-700" />
                    <CardTitle>Recent Inspection Requests</CardTitle>
                  </div>
                  <Link href="/admin/inspections" className="text-sm font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1">
                    Manage all <ArrowRight className="size-4" />
                  </Link>
                </CardHeader>
                <CardBody>
                  {inspections.length === 0 ? (
                    <p className="text-sm text-ink-500 text-center py-6">No inspection requests found.</p>
                  ) : (
                    <div className="divide-y divide-ink-100">
                      {inspections.slice(0, 4).map((request) => (
                        <div key={request.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                          <div>
                            <p className="font-semibold text-ink-950">{request.propertyTitle}</p>
                            <p className="text-xs text-ink-500 mt-0.5">{request.date} · {request.time}</p>
                          </div>
                          <Badge tone={request.status === "PENDING" ? "warning" : request.status === "APPROVED" ? "success" : "neutral"}>
                            {request.status}
                          </Badge>
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
                  <Link href="/admin/inspections" className="w-full">
                    <Button block tone="outline" className="justify-start gap-2">
                      <CalendarCheck className="size-4" /> Manage Inspections ({pendingInspections} pending)
                    </Button>
                  </Link>
                  <Link href="/admin/waitlist" className="w-full">
                    <Button block tone="outline" className="justify-start gap-2">
                      <MailPlus className="size-4" /> Manage Waitlist
                    </Button>
                  </Link>
                  <Link href="/admin/reports" className="w-full">
                    <Button block tone="outline" className="justify-start gap-2">
                      <Flag className="size-4" /> Review Reports ({openReports} open)
                    </Button>
                  </Link>
                </CardBody>
              </Card>

              {reports.length === 0 && !reportsLoading ? (
                <Card className="mt-6">
                  <CardBody className="text-sm text-ink-500">There are no user reports to review.</CardBody>
                </Card>
              ) : null}
            </div>
          </div>
        </Container>
      </Section>
    </main>
  );
}
