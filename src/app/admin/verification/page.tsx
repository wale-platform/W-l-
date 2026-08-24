"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Container, Section, SectionHeading } from "@/components/layout/Container";
import { Button, Card, CardBody, CardHeader, CardTitle, Badge, toast } from "@/components/ui";
import { propertyApi } from "@/lib/api/property";
import { ShieldCheck, ShieldAlert, Check, X, MapPin } from "lucide-react";

export default function AdminVerificationPage() {
  const queryClient = useQueryClient();

  // Fetch all properties
  const { data, isLoading } = useQuery({
    queryKey: ["adminAllProperties"],
    queryFn: () => propertyApi.list({}),
  });

  // Verify mutation
  const verifyMutation = useMutation({
    mutationFn: ({ id, verified }: { id: string; verified: boolean }) =>
      propertyApi.updateVerification(id, verified),
    onSuccess: (res) => {
      toast.success("Listing verified", { description: "The property has been successfully verified." });
      queryClient.invalidateQueries({ queryKey: ["adminAllProperties"] });
    },
    onError: (err: any) => {
      toast.error("Failed to verify", { description: err.message || "An error occurred." });
    },
  });

  // Reject (delete) mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => propertyApi.delete(id),
    onSuccess: () => {
      toast.success("Listing rejected", { description: "The property listing has been rejected and removed." });
      queryClient.invalidateQueries({ queryKey: ["adminAllProperties"] });
    },
    onError: (err: any) => {
      toast.error("Failed to reject", { description: err.message || "An error occurred." });
    },
  });

  const pendingProperties = (data?.properties || []).filter((p) => !p.verified);

  if (isLoading) {
    return (
      <main className="animate-pulse">
        <Section>
          <Container size="wide" className="flex flex-col gap-8">
            <div className="h-10 w-64 bg-ink-200 rounded" />
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
            eyebrow="Admin"
            title="Verify Properties"
            lead="Review pending properties submitted by Landlords, Lawyers, and Tenants, and manage verification status."
          />

          {pendingProperties.length === 0 ? (
            <Card>
              <CardBody className="flex flex-col items-center gap-4 py-16 text-center">
                <div className="flex size-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                  <ShieldCheck className="size-8" />
                </div>

                <div className="flex flex-col gap-2">
                  <h3 className="text-lg font-semibold text-ink-900 font-display">
                    All caught up!
                  </h3>

                  <p className="max-w-md text-sm leading-6 text-ink-500">
                    There are no properties currently awaiting verification.
                  </p>
                </div>
              </CardBody>
            </Card>
          ) : (
            <div className="grid gap-6">
              {pendingProperties.map((property) => (
                <Card key={property.id}>
                  <CardBody className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-4">
                      {property.images?.[0] && (
                        <img
                          src={property.images[0]}
                          alt={property.title}
                          className="size-20 rounded-lg object-cover bg-ink-100 hidden sm:block"
                        />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-semibold text-ink-950">{property.title}</h3>
                          <Badge tone="warning">Pending Review</Badge>
                        </div>
                        <p className="text-xs text-ink-500 mt-1 flex items-center gap-1">
                          <MapPin className="size-3 text-ink-400" />
                          {property.address}, {property.city}
                        </p>
                        <p className="text-sm font-semibold text-brand-700 mt-1.5">
                          ₦{property.price.toLocaleString()} / year
                        </p>
                        <p className="text-xs text-ink-500 font-medium mt-2">
                          Submitted by: <span className="uppercase text-brand-700">{property.source}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <Button
                        size="sm"
                        tone="outline"
                        className="flex items-center gap-1 text-danger hover:bg-danger-50"
                        onClick={() => {
                          if (confirm("Reject and delete this listing?")) {
                            deleteMutation.mutate(property.id);
                          }
                        }}
                        disabled={deleteMutation.isPending || verifyMutation.isPending}
                      >
                        <X className="size-4" /> Reject & Delete
                      </Button>
                      <Button
                        size="sm"
                        className="flex items-center gap-1"
                        onClick={() => verifyMutation.mutate({ id: property.id, verified: true })}
                        disabled={deleteMutation.isPending || verifyMutation.isPending}
                      >
                        <Check className="size-4" /> Verify & Approve
                      </Button>
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
          )}
        </Container>
      </Section>
    </main>
  );
}