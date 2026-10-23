"use client";

import { useState } from "react";
import Image from "next/image";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Container, Section, SectionHeading } from "@/components/layout/Container";
import { Alert, Badge, Button, Card, CardBody, CardHeader, CardTitle, toast } from "@/components/ui";
import { inspectionsApi, type InspectionRequest, type InspectionStatus } from "@/lib/api/inspections";
import { CalendarCheck, Check, Clock3, X } from "lucide-react";

function formatDate(date: string) {
  const parsed = new Date(`${date}T12:00:00`);
  return Number.isNaN(parsed.getTime())
    ? date
    : new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" }).format(parsed);
}

function statusTone(status: InspectionStatus) {
  if (status === "PENDING") return "warning";
  if (status === "APPROVED" || status === "COMPLETED") return "success";
  if (status === "REJECTED") return "danger";
  return "neutral";
}

export default function AdminInspectionsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<InspectionStatus | "ALL">("ALL");
  const { data: requests = [], isLoading, isError } = useQuery({
    queryKey: ["adminInspections"],
    queryFn: () => inspectionsApi.listRequests(),
  });
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: InspectionStatus }) =>
      inspectionsApi.updateStatus(id, status),
    onSuccess: (_request, variables) => {
      toast.success("Inspection updated", { description: `Request marked ${variables.status.toLowerCase()}.` });
      queryClient.invalidateQueries({ queryKey: ["adminInspections"] });
    },
    onError: (error) => {
      toast.error("Could not update inspection", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    },
  });

  const visibleRequests = requests.filter(
    (request) => statusFilter === "ALL" || request.status === statusFilter,
  );
  const updateStatus = (request: InspectionRequest, status: InspectionStatus) => {
    if (
      (status === "REJECTED" || status === "CANCELLED") &&
      !window.confirm(`Are you sure you want to mark this inspection ${status.toLowerCase()}?`)
    ) {
      return;
    }
    statusMutation.mutate({ id: request.id, status });
  };

  if (isLoading) {
    return (
      <main className="animate-pulse">
        <Section>
          <Container size="wide" className="flex flex-col gap-8">
            <div className="h-10 w-64 rounded bg-ink-200" />
            <div className="h-64 rounded-card bg-ink-200" />
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
            title="Inspection Management"
            lead="Review inspection requests and keep their status up to date."
          />

          {isError && (
            <Alert tone="danger" title="Inspection requests could not be loaded">
              Refresh the page to retry. Your saved requests have not been changed.
            </Alert>
          )}

          <Card>
            <CardHeader className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>Inspection requests ({requests.length})</CardTitle>
                <p className="mt-1 text-sm text-ink-500">
                  {requests.filter((request) => request.status === "PENDING").length} waiting for review
                </p>
              </div>
              <label className="flex items-center gap-2 text-sm font-medium text-ink-700">
                Status
                <select
                  className="rounded-field border border-ink-200 bg-white px-3 py-2"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as InspectionStatus | "ALL")}
                >
                  <option value="ALL">All requests</option>
                  <option value="PENDING">Pending</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="CANCELLED">Cancelled</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </label>
            </CardHeader>

            <CardBody>
              {visibleRequests.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-12 text-center">
                  <CalendarCheck className="size-10 text-ink-300" />
                  <h3 className="font-semibold text-ink-900">
                    {requests.length === 0 ? "No inspection requests yet" : "No requests match this status"}
                  </h3>
                  <p className="max-w-md text-sm text-ink-500">
                    New inspection requests will appear here when submitted.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {visibleRequests.map((request) => (
                    <article
                      key={request.id}
                      className="flex flex-col gap-4 rounded-xl border border-ink-150 p-4 sm:flex-row sm:items-center"
                    >
                      <Image
                        src={
                          request.propertyImage
                            ? request.propertyImage.includes("?")
                              ? request.propertyImage
                              : `${request.propertyImage}?v=2`
                            : "/listings/listing-01.jpg?v=2"
                        }
                        alt={request.propertyTitle}
                        width={120}
                        height={88}
                        className="h-24 w-full rounded-lg object-cover sm:w-32"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-ink-950">{request.propertyTitle}</h3>
                          <Badge tone={statusTone(request.status)}>{request.status}</Badge>
                        </div>
                        <p className="mt-1 text-sm text-ink-500">
                          ₦{request.price.toLocaleString()} / year
                        </p>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-600">
                          <span className="inline-flex items-center gap-1.5">
                            <CalendarCheck className="size-4 text-ink-400" />
                            {formatDate(request.date)}
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <Clock3 className="size-4 text-ink-400" />
                            {request.time}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 sm:justify-end">
                        {request.status === "PENDING" && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => updateStatus(request, "APPROVED")}
                              disabled={statusMutation.isPending}
                            >
                              <Check className="size-4" /> Approve
                            </Button>
                            <Button
                              size="sm"
                              tone="danger"
                              onClick={() => updateStatus(request, "REJECTED")}
                              disabled={statusMutation.isPending}
                            >
                              <X className="size-4" /> Reject
                            </Button>
                          </>
                        )}
                        {request.status === "APPROVED" && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => updateStatus(request, "COMPLETED")}
                              disabled={statusMutation.isPending}
                            >
                              <Check className="size-4" /> Mark completed
                            </Button>
                            <Button
                              size="sm"
                              tone="outline"
                              onClick={() => updateStatus(request, "CANCELLED")}
                              disabled={statusMutation.isPending}
                            >
                              Cancel
                            </Button>
                          </>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </Container>
      </Section>
    </main>
  );
}
