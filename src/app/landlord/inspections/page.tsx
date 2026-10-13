"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Container, Section, SectionHeading } from "@/components/layout/Container";
import { Button, Card, CardBody, CardHeader, CardTitle, Badge, toast } from "@/components/ui";
import { inspectionsApi, type InspectionStatus } from "@/lib/api/inspections";
import { Calendar, Clock, Check, X, MapPin } from "lucide-react";

export default function InspectionsPage() {
  const queryClient = useQueryClient();

  // Fetch inspections
  const { data: inspections, isLoading } = useQuery({
    queryKey: ["landlordInspections"],
    queryFn: () => inspectionsApi.listRequests(),
  });

  // Update inspection mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: InspectionStatus }) =>
      inspectionsApi.updateStatus(id, status),
    onSuccess: (data) => {
      toast.success(`Request ${data.status.toLowerCase()}`, {
        description: `Inspection request has been successfully updated to ${data.status.toLowerCase()}.`,
      });
      queryClient.invalidateQueries({ queryKey: ["landlordInspections"] });
    },
    onError: (err: any) => {
      toast.error("Action failed", { description: err.message || "An error occurred." });
    },
  });

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
            eyebrow="Inspections"
            title="Inspection Requests"
            lead="View and manage requests from students interested in inspecting your properties."
          />

          {!inspections || inspections.length === 0 ? (
            <Card>
              <CardBody className="flex flex-col items-center gap-4 py-16 text-center">
                <div className="flex size-16 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                  <span className="text-2xl">📅</span>
                </div>

                <div className="flex flex-col gap-2">
                  <h3 className="text-lg font-semibold text-ink-900 font-display">
                    No inspection requests yet
                  </h3>

                  <p className="max-w-md text-sm leading-6 text-ink-500">
                    Inspection requests from students will appear here when
                    someone wants to view one of your properties.
                  </p>
                </div>
              </CardBody>
            </Card>
          ) : (
            <div className="grid gap-6">
              {inspections.map((request) => (
                <Card key={request.id}>
                  <CardBody className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-4">
                      {request.propertyImage && (
                        <img
                          src={request.propertyImage}
                          alt={request.propertyTitle}
                          className="size-16 rounded-lg object-cover bg-ink-100 hidden sm:block"
                        />
                      )}
                      <div>
                        <h3 className="text-base font-semibold text-ink-950">{request.propertyTitle}</h3>
                        <p className="text-sm font-semibold text-brand-700 mt-0.5">₦{request.price.toLocaleString()} / year</p>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-ink-500 font-medium">
                          <span className="flex items-center gap-1">
                            <Calendar className="size-3.5 text-ink-400" />
                            {request.date}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="size-3.5 text-ink-400" />
                            {request.time}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-3 sm:text-right">
                      <Badge
                        tone={
                          request.status === "APPROVED"
                            ? "success"
                            : request.status === "REJECTED" || request.status === "CANCELLED"
                            ? "danger"
                            : "warning"
                        }
                      >
                        {request.status}
                      </Badge>

                      {request.status === "PENDING" && (
                        <div className="flex items-center gap-2 mt-1">
                          <Button
                            size="sm"
                            tone="outline"
                            className="flex items-center gap-1"
                            onClick={() => updateMutation.mutate({ id: request.id, status: "REJECTED" })}
                            disabled={updateMutation.isPending}
                          >
                            <X className="size-3.5" /> Reject
                          </Button>
                          <Button
                            size="sm"
                            className="flex items-center gap-1"
                            onClick={() => updateMutation.mutate({ id: request.id, status: "APPROVED" })}
                            disabled={updateMutation.isPending}
                          >
                            <Check className="size-3.5" /> Approve
                          </Button>
                        </div>
                      )}
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