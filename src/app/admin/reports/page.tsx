"use client";

import { useState } from "react";
import { Container, Section, SectionHeading } from "@/components/layout/Container";
import { Card, CardBody, CardHeader, CardTitle, Badge, Button, toast } from "@/components/ui";
import { AlertTriangle, Check, ShieldAlert } from "lucide-react";

interface Report {
  id: string;
  reporter: string;
  reportedItem: string;
  reason: string;
  details: string;
  status: "OPEN" | "RESOLVED";
  createdAt: string;
}

const DEFAULT_REPORTS: Report[] = [
  {
    id: "rep-001",
    reporter: "Tunde Olowo (Student)",
    reportedItem: "Modern self-contained studio at Tanke",
    reason: "Incorrect pricing / misleading information",
    details: "Landlord claims price is ₦850k on the site, but requested ₦950k in person during inspection.",
    status: "OPEN",
    createdAt: "2026-08-22T10:00:00Z",
  },
  {
    id: "rep-002",
    reporter: "Amina Bello (Student)",
    reportedItem: "Shared 2-bedroom flat near UI Second Gate",
    reason: "Fake agent / listing",
    details: "This property is already occupied. The uploader is not the owner or legal representative.",
    status: "OPEN",
    createdAt: "2026-08-23T14:20:00Z",
  },
];

export default function AdminReportsPage() {
  const [reports, setReports] = useState<Report[]>(DEFAULT_REPORTS);

  const handleResolve = (id: string) => {
    const updated = reports.map((r) => (r.id === id ? { ...r, status: "RESOLVED" as const } : r));
    setReports(updated);
    toast.success("Report resolved", { description: "The issue has been marked as resolved." });
  };

  const handleDeleteListing = (id: string, itemName: string) => {
    if (confirm(`Are you sure you want to remove the reported listing "${itemName}"?`)) {
      // Filter out the report from list or mark resolved
      const updated = reports.filter((r) => r.id !== id);
      setReports(updated);
      toast.success("Listing removed", { description: "The reported listing was taken down successfully." });
    }
  };

  return (
    <main>
      <Section>
        <Container size="wide" className="flex flex-col gap-8">
          <SectionHeading
            eyebrow="Admin"
            title="View Reports"
            lead="Review, inspect, and address user complaints about listings, pricing, and agent conduct."
          />

          <Card>
            <CardHeader>
              <CardTitle>Platform Reports ({reports.filter(r => r.status === "OPEN").length} Open)</CardTitle>
            </CardHeader>

            <CardBody>
              {reports.length === 0 ? (
                <div className="flex flex-col items-center gap-4 py-16 text-center">
                  <div className="size-16 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <Check className="size-8" />
                  </div>
                  <h3 className="text-lg font-semibold text-ink-900">All reports resolved</h3>
                  <p className="text-sm text-ink-500">There are no pending user reports to review.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-6">
                  {reports.map((report) => (
                    <div
                      key={report.id}
                      className={`p-5 rounded-xl border flex flex-col md:flex-row gap-5 justify-between items-start ${
                        report.status === "RESOLVED"
                          ? "bg-ink-50/50 border-ink-100 opacity-60"
                          : "bg-amber-50/20 border-amber-200"
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className={`p-3 rounded-lg ${
                            report.status === "RESOLVED"
                              ? "bg-ink-100 text-ink-500"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          <AlertTriangle className="size-6" />
                        </div>
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-ink-950">{report.reason}</h3>
                            <Badge tone={report.status === "OPEN" ? "warning" : "success"}>
                              {report.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-ink-600 mt-1">
                            Reported Listing: <strong className="text-ink-900">{report.reportedItem}</strong>
                          </p>
                          <p className="text-sm text-ink-500 mt-2 font-medium">
                            Reporter: {report.reporter} | {new Date(report.createdAt).toLocaleDateString()}
                          </p>
                          <blockquote className="mt-3 p-3 bg-white/60 rounded border border-ink-100 text-sm text-ink-700 italic">
                            "{report.details}"
                          </blockquote>
                        </div>
                      </div>

                      {report.status === "OPEN" && (
                        <div className="flex items-center gap-2 self-end md:self-start">
                          <Button
                            size="sm"
                            tone="outline"
                            className="flex items-center gap-1"
                            onClick={() => handleResolve(report.id)}
                          >
                            <Check className="size-4" /> Resolve
                          </Button>
                          <Button
                            size="sm"
                            tone="danger"
                            className="flex items-center gap-1"
                            onClick={() => handleDeleteListing(report.id, report.reportedItem)}
                          >
                            <ShieldAlert className="size-4" /> Take Down Listing
                          </Button>
                        </div>
                      )}
                    </div>
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