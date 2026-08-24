"use client";

import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PropertyCard } from "@/components/ui/PropertyCard";
import { Container, Section, SectionHeading } from "@/components/layout/Container";
import { Button, Card, CardBody, CardHeader, CardTitle, toast } from "@/components/ui";
import { propertyApi } from "@/lib/api/property";
import { Plus } from "lucide-react";

export default function TenantPropertiesPage() {
  const queryClient = useQueryClient();

  // Fetch properties uploaded by this tenant
  const { data, isLoading } = useQuery({
    queryKey: ["tenantProperties"],
    queryFn: () => propertyApi.list({ source: "tenant" }),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => propertyApi.delete(id),
    onSuccess: () => {
      toast.success("Handover listing deleted", { description: "The apartment listing has been successfully removed." });
      queryClient.invalidateQueries({ queryKey: ["tenantProperties"] });
    },
    onError: (err: any) => {
      toast.error("Failed to delete", { description: err.message || "An error occurred." });
    },
  });

  const properties = data?.properties || [];

  if (isLoading) {
    return (
      <main className="animate-pulse">
        <Section>
          <Container size="wide" className="flex flex-col gap-8">
            <div className="h-10 w-64 bg-ink-200 rounded" />
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-48 bg-ink-200 rounded-card" />
              ))}
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
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <SectionHeading
              eyebrow="Outgoing Tenant"
              title="Manage Handover Listings"
              lead="Review and update the apartment information you submitted for handover."
            />
            <Link href="/tenant/properties/upload">
              <Button className="flex items-center gap-2">
                <Plus className="size-4" /> Upload Apartment
              </Button>
            </Link>
          </div>

          {properties.length === 0 ? (
            <Card>
              <CardBody className="flex flex-col items-center gap-4 py-16 text-center">
                <div className="flex size-16 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                  <span className="text-2xl">🔑</span>
                </div>

                <div className="flex flex-col gap-2">
                  <h3 className="text-lg font-semibold text-ink-900 font-display">
                    No handover listings yet
                  </h3>

                  <p className="max-w-md text-sm leading-6 text-ink-500">
                    Your submitted apartment handover details will appear here.
                  </p>
                </div>

                <Link href="/tenant/properties/upload">
                  <Button>
                    Upload Your Apartment Details
                  </Button>
                </Link>
              </CardBody>
            </Card>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {properties.map((property) => (
                <PropertyCard
                  key={property.id}
                  title={property.title}
                  price={property.price}
                  location={property.address}
                  status={property.verified ? "approved" : "pending"}
                  onDelete={() => {
                    if (confirm("Are you sure you want to delete this listing?")) {
                      deleteMutation.mutate(property.id);
                    }
                  }}
                />
              ))}
            </div>
          )}
        </Container>
      </Section>
    </main>
  );
}