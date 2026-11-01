"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PropertyCard } from "@/components/ui/PropertyCard";
import { BoostDialog, BoostReturnNotice } from "@/components/property/BoostDialog";
import { Container, Section, SectionHeading } from "@/components/layout/Container";
import { Button, Card, CardBody, CardHeader, CardTitle, toast } from "@/components/ui";
import { propertyApi } from "@/lib/api/property";
import { Plus } from "lucide-react";

export default function LandlordPropertiesPage() {
  const queryClient = useQueryClient();
  const [boosting, setBoosting] = useState<{ id: string; title: string } | null>(null);

  // Fetch landlord properties
  const { data, isLoading } = useQuery({
    queryKey: ["myProperties"],
    queryFn: () => propertyApi.listMine(),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => propertyApi.delete(id),
    onSuccess: () => {
      toast.success("Listing deleted", { description: "Your property listing has been successfully removed." });
      queryClient.invalidateQueries({ queryKey: ["myProperties"] });
    },
    onError: (err: Error) => {
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
              eyebrow="Properties"
              title="My Properties"
              lead="View and manage the properties you have submitted to WALE."
            />
            <Link href="/landlord/upload-property">
              <Button className="flex items-center gap-2">
                <Plus className="size-4" /> Upload Property
              </Button>
            </Link>
          </div>

          <Suspense fallback={null}>
            <BoostReturnNotice />
          </Suspense>

          {properties.length === 0 ? (
            <Card>
              <CardBody className="flex flex-col items-center gap-4 py-16 text-center">
                <div className="flex size-16 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                  <span className="text-2xl">🏠</span>
                </div>

                <div className="flex flex-col gap-2">
                  <h3 className="text-lg font-semibold text-ink-900 font-display">
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
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {properties.map((property) => (
                <PropertyCard
                  key={property.id}
                  title={property.title}
                  price={property.price}
                  location={`${property.address}, ${property.city}`}
                  status={property.verified ? "approved" : "pending"}
                  image={property.images[0]}
                  href={`/properties/${property.id}`}
                  boostedUntil={property.boostedUntil}
                  onBoost={() => setBoosting({ id: property.id, title: property.title })}
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
      <BoostDialog
        listing={boosting}
        onClose={() => setBoosting(null)}
        onBoosted={() => queryClient.invalidateQueries({ queryKey: ["myProperties"] })}
      />
    </main>
  );
}