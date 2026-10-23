"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Container, Section, SectionHeading } from "@/components/layout/Container";
import { Alert, Badge, Button, Card, CardBody, CardHeader, CardTitle, toast } from "@/components/ui";
import { propertyApi } from "@/lib/api/property";
import { reportsApi, type UserReport } from "@/lib/api/reports";
import { AlertTriangle, Check, ShieldAlert } from "lucide-react";

export default function AdminReportsPage() {
  const queryClient = useQueryClient();
  const { data: reports = [], isLoading, isError } = useQuery({
    queryKey: ["adminReports"],
    queryFn: () => reportsApi.listReports(),
  });

  const resolveMutation = useMutation({
    mutationFn: (id: string) => reportsApi.updateStatus(id, "RESOLVED"),
    onSuccess: () => {
      toast.success("Report resolved", { description: "The issue has been marked as resolved." });
      queryClient.invalidateQueries({ queryKey: ["adminReports"] });
    },
    onError: (error) => {
      toast.error("Could not resolve report", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    },
  });

  const takeDownMutation = useMutation({
    mutationFn: async (report: UserReport) => {
      const { properties } = await propertyApi.list({});
      const reportedTitle = report.reportedItem.trim().toLocaleLowerCase();
      const property = properties.find(
        (item) => item.title.trim().toLocaleLowerCase() === reportedTitle,
      );
      if (!property) throw new Error("The reported listing could not be found; no data was removed.");

      await propertyApi.delete(property.id);
      await reportsApi.deleteReport(report.id);
    },
    onSuccess: () => {
      toast.success("Listing taken down", { description: "The listing and its report have been removed." });
      queryClient.invalidateQueries({ queryKey: ["adminReports"] });
      queryClient.invalidateQueries({ queryKey: ["adminAllProperties"] });
    },
    onError: (error) => {
      toast.error("Could not take down listing", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    },
  });

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

  const openCount = reports.filter((report) => report.status === "OPEN").length;

  return (
    <main>
      <Section>
        <Container size="wide" className="flex flex-col gap-8">
          <SectionHeading
            eyebrow="Admin"
            title="User Reports"
            lead="Review complaints about listings, pricing, and agent conduct."
          />

          {isError && (
            <Alert tone="danger" title="Reports could not be loaded">
              Refresh the page to retry. Report data has not been changed.
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Platform Reports ({openCount} open)</CardTitle>
            </CardHeader>
            <CardBody>
              {reports.length === 0 ? (
                <div className="flex flex-col items-center gap-4 py-16 text-center">
                  <div className="flex size-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                    <Check className="size-8" />
                  </div>
                  <h3 className="text-lg font-semibold text-ink-900">No reports to review</h3>
                  <p className="text-sm text-ink-500">New user reports will appear here.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-6">
                  {reports.map((report) => {
                    const isBusy = resolveMutation.isPending || takeDownMutation.isPending;
                    return (
                      <article
                        key={report.id}
                        className={`flex flex-col items-start justify-between gap-5 rounded-xl border p-5 md:flex-row ${
                          report.status === "RESOLVED"
                            ? "border-ink-100 bg-ink-50/50 opacity-70"
                            : "border-amber-200 bg-amber-50/20"
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <div className={`rounded-lg p-3 ${report.status === "RESOLVED" ? "bg-ink-100 text-ink-500" : "bg-amber-100 text-amber-700"}`}>
                            <AlertTriangle className="size-6" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-semibold text-ink-950">{report.reason}</h3>
                              <Badge tone={report.status === "OPEN" ? "warning" : "success"}>{report.status}</Badge>
                            </div>
                            <p className="mt-1 text-sm text-ink-600">
                              Reported listing: <strong className="text-ink-900">{report.reportedItem}</strong>
                            </p>
                            <p className="mt-2 text-sm font-medium text-ink-500">
                              Reporter: {report.reporter} · {new Date(report.createdAt).toLocaleDateString()}
                            </p>
                            <blockquote className="mt-3 rounded border border-ink-100 bg-white/60 p-3 text-sm italic text-ink-700">
                              “{report.details}”
                            </blockquote>
                          </div>
                        </div>

                        {report.status === "OPEN" && (
                          <div className="flex shrink-0 flex-wrap items-center gap-2 self-end md:self-start">
                            <Button
                              size="sm"
                              tone="outline"
                              onClick={() => resolveMutation.mutate(report.id)}
                              disabled={isBusy}
                            >
                              <Check className="size-4" /> Resolve
                            </Button>
                            <Button
                              size="sm"
                              tone="danger"
                              onClick={() => {
                                if (window.confirm(`Take down the reported listing "${report.reportedItem}"?`)) {
                                  takeDownMutation.mutate(report);
                                }
                              }}
                              disabled={isBusy}
                            >
                              <ShieldAlert className="size-4" /> Take Down Listing
                            </Button>
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
            </CardBody>
          </Card>
        </Container>
      </Section>
    </main>
  );
}
