"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarCheck, Check, CheckCheck, Clock3, X } from "lucide-react";
import {
  AdminPageHeader,
  EmptyState,
  FilterTabs,
  LoadingRows,
  Panel,
  SearchBox,
  formatDateTime,
} from "@/components/admin/AdminUI";
import { Badge, Button, ErrorState, toast } from "@/components/ui";
import { inspectionsApi, type InspectionRequest, type InspectionStatus } from "@/lib/api/inspections";
import { formatNaira } from "@/lib/utils/format";

type Filter = "ALL" | InspectionStatus;

const statusBadge: Record<InspectionStatus, { tone: "warning" | "success" | "danger" | "neutral" | "info"; label: string }> = {
  PENDING: { tone: "warning", label: "Pending" },
  APPROVED: { tone: "success", label: "Approved" },
  REJECTED: { tone: "danger", label: "Declined" },
  CANCELLED: { tone: "neutral", label: "Cancelled" },
  COMPLETED: { tone: "info", label: "Completed" },
};

function formatVisit(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-NG", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

export default function AdminInspectionsPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<Filter>("ALL");
  const [q, setQ] = useState("");

  const { data = [], isPending, isError, refetch } = useQuery({
    queryKey: ["admin", "inspections"],
    queryFn: () => inspectionsApi.listRequests("all"),
  });

  const update = useMutation({
    mutationFn: ({ id, status }: { id: string; status: InspectionStatus }) => inspectionsApi.updateStatus(id, status),
    onSuccess: () => {
      toast.success("Appointment updated", { description: "Everyone involved has been notified." });
      void queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (error: Error) => toast.error("Couldn't update appointment", { description: error.message }),
  });

  const term = q.trim().toLowerCase();
  const visible = data.filter(
    (request) =>
      (filter === "ALL" || request.status === filter) &&
      (!term ||
        [request.propertyTitle, request.requester?.name, request.requester?.email, request.ownerName]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(term))),
  );
  const count = (status: InspectionStatus) => data.filter((request) => request.status === status).length;

  const act = (request: InspectionRequest, status: InspectionStatus) => update.mutate({ id: request.id, status });

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Appointments"
        lead="Every inspection request on WALE. Approve, decline, complete or cancel on anyone's behalf."
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <FilterTabs<Filter>
          label="Filter appointments"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "ALL", label: "All", count: data.length },
            { value: "PENDING", label: "Pending", count: count("PENDING") },
            { value: "APPROVED", label: "Approved", count: count("APPROVED") },
            { value: "COMPLETED", label: "Completed", count: count("COMPLETED") },
            { value: "REJECTED", label: "Declined", count: count("REJECTED") },
            { value: "CANCELLED", label: "Cancelled", count: count("CANCELLED") },
          ]}
        />
        <SearchBox value={q} onChange={setQ} placeholder="Search listing, requester or owner" />
      </div>

      <Panel>
        {isError ? (
          <ErrorState title="Appointments couldn't be loaded" action={<Button onClick={() => void refetch()}>Try again</Button>} />
        ) : isPending ? (
          <LoadingRows />
        ) : visible.length === 0 ? (
          <EmptyState>No appointments match these filters.</EmptyState>
        ) : (
          <ul className="divide-y divide-ink-100">
            {visible.map((request) => (
              <li key={request.id} className="flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center">
                <div className="flex min-w-0 flex-1 gap-4">
                  <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-xl bg-ink-100">
                    {request.propertyImage && (
                      <Image src={request.propertyImage} alt="" fill sizes="96px" className="object-cover" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-ink-900">
                      <Link href={`/properties/${request.propertyId}`} className="hover:underline">
                        {request.propertyTitle}
                      </Link>
                      <Badge tone={statusBadge[request.status].tone}>{statusBadge[request.status].label}</Badge>
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-ink-600">
                      <span className="inline-flex items-center gap-1">
                        <CalendarCheck aria-hidden="true" className="size-3.5" /> {formatVisit(request.date)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock3 aria-hidden="true" className="size-3.5" /> {request.time}
                      </span>
                      <span>{formatNaira(request.price)}/yr</span>
                    </p>
                    <p className="mt-0.5 truncate text-xs text-ink-500">
                      Requested by {request.requester?.name ?? "—"}
                      {request.requester?.email && ` · ${request.requester.email}`}
                      {request.requester?.phone && ` · ${request.requester.phone}`}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-400">
                      Owner: {request.ownerName ?? "WALE (sample listing)"} · requested {formatDateTime(request.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {request.status === "PENDING" && (
                    <>
                      <Button size="sm" onClick={() => act(request, "APPROVED")} disabled={update.isPending}>
                        <Check aria-hidden="true" className="size-4" /> Approve
                      </Button>
                      <Button tone="outline" size="sm" onClick={() => act(request, "REJECTED")} disabled={update.isPending}>
                        <X aria-hidden="true" className="size-4" /> Decline
                      </Button>
                    </>
                  )}
                  {request.status === "APPROVED" && (
                    <>
                      <Button size="sm" onClick={() => act(request, "COMPLETED")} disabled={update.isPending}>
                        <CheckCheck aria-hidden="true" className="size-4" /> Mark completed
                      </Button>
                      <Button tone="outline" size="sm" onClick={() => act(request, "CANCELLED")} disabled={update.isPending}>
                        Cancel
                      </Button>
                    </>
                  )}
                  {(request.status === "REJECTED" || request.status === "CANCELLED") && (
                    <Button tone="outline" size="sm" onClick={() => act(request, "PENDING")} disabled={update.isPending}>
                      Reopen
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
