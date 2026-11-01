"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Rocket, ShieldCheck, ShieldOff, Trash2 } from "lucide-react";
import {
  AdminPageHeader,
  EmptyState,
  FilterTabs,
  LoadingRows,
  Panel,
  SearchBox,
  formatDay,
  useDebouncedValue,
} from "@/components/admin/AdminUI";
import { Badge, Button, ConfirmDialog, ErrorState, toast } from "@/components/ui";
import { adminApi, type AdminListing } from "@/lib/api/admin";
import { propertyApi } from "@/lib/api/property";
import { formatNaira, formatPropertyType } from "@/lib/utils/format";

type StatusFilter = "" | "pending" | "verified";

/** Moderation of submitted listings (used by /admin/listings and /admin/verification). */
export function AdminListings({ initialStatus = "" }: { initialStatus?: StatusFilter }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<StatusFilter>(initialStatus);
  const [q, setQ] = useState("");
  const search = useDebouncedValue(q);
  const [deleting, setDeleting] = useState<AdminListing | null>(null);
  // Captured once per visit; render must stay pure.
  const [now] = useState(() => Date.now());

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["admin", "listings", { status, search }],
    queryFn: () => adminApi.listings({ status, q: search }),
  });
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ["admin"] });

  const verify = useMutation({
    mutationFn: ({ id, verified }: { id: string; verified: boolean }) => propertyApi.updateVerification(id, verified),
    onSuccess: (_result, { verified }) => {
      toast.success(verified ? "Listing verified" : "Verification removed", { description: "The owner has been notified." });
      refresh();
    },
    onError: (error: Error) => toast.error("Couldn't update listing", { description: error.message }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => propertyApi.delete(id),
    onSuccess: () => {
      toast.success("Listing deleted");
      setDeleting(null);
      refresh();
    },
    onError: (error: Error) => toast.error("Couldn't delete listing", { description: error.message }),
  });

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title={initialStatus === "pending" ? "Verify listings" : "Listings"}
        lead="Review submitted listings, verify them after an in-person check, or remove ones that break the rules."
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <FilterTabs<StatusFilter>
          label="Filter listings"
          value={status}
          onChange={setStatus}
          options={[
            { value: "", label: "All" },
            { value: "pending", label: "Pending verification" },
            { value: "verified", label: "Verified" },
          ]}
        />
        <SearchBox value={q} onChange={setQ} placeholder="Search title, area or owner" />
      </div>

      <Panel>
        {isError ? (
          <ErrorState title="Listings couldn't be loaded" action={<Button onClick={() => void refetch()}>Try again</Button>} />
        ) : isPending ? (
          <LoadingRows />
        ) : data.length === 0 ? (
          <EmptyState>
            {status === "pending" ? "Nothing waiting for verification." : "No submitted listings match these filters."}
          </EmptyState>
        ) : (
          <ul className="divide-y divide-ink-100">
            {data.map((listing) => {
              const boosted = listing.boostedUntil && new Date(listing.boostedUntil).getTime() > now;
              return (
                <li key={listing.id} className="flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center">
                  <div className="flex min-w-0 flex-1 gap-4">
                    <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-xl bg-ink-100">
                      {listing.image && <Image src={listing.image} alt="" fill sizes="112px" className="object-cover" />}
                    </div>
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-ink-900">
                        {listing.title}
                        {listing.verified ? <Badge tone="success">Verified</Badge> : <Badge tone="warning">Pending</Badge>}
                        {boosted && (
                          <Badge tone="brand">
                            <Rocket aria-hidden="true" className="size-3" /> Boosted
                          </Badge>
                        )}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-ink-500">
                        {formatPropertyType(listing.type)} · {formatNaira(listing.price)}/yr · {listing.location}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-ink-500">
                        By {listing.owner.name} ({listing.source}) · {listing.owner.email} · {listing.owner.phone}
                      </p>
                      <p className="mt-0.5 text-xs text-ink-400">
                        Submitted {formatDay(listing.createdAt)} · {listing.inspections} inspection request
                        {listing.inspections === 1 ? "" : "s"}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/properties/${listing.id}`}>
                      <Button tone="outline" size="sm">
                        <Eye aria-hidden="true" className="size-4" /> View
                      </Button>
                    </Link>
                    {listing.verified ? (
                      <Button
                        tone="outline"
                        size="sm"
                        onClick={() => verify.mutate({ id: listing.id, verified: false })}
                        disabled={verify.isPending}
                      >
                        <ShieldOff aria-hidden="true" className="size-4" /> Unverify
                      </Button>
                    ) : (
                      <Button size="sm" onClick={() => verify.mutate({ id: listing.id, verified: true })} disabled={verify.isPending}>
                        <ShieldCheck aria-hidden="true" className="size-4" /> Verify
                      </Button>
                    )}
                    <Button
                      tone="ghost"
                      size="sm"
                      onClick={() => setDeleting(listing)}
                      aria-label={`Delete ${listing.title}`}
                      className="text-danger hover:bg-danger-subtle"
                    >
                      <Trash2 aria-hidden="true" className="size-4" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <p className="text-xs text-ink-500">
        WALE&apos;s built-in sample listings aren&apos;t shown here; this page covers listings submitted by landlords,
        lawyers and outgoing tenants.
      </p>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && remove.mutate(deleting.id)}
        title={`Delete "${deleting?.title ?? "this listing"}"?`}
        description="The listing and its photos are removed permanently. This can't be undone."
        confirmLabel="Delete listing"
        tone="danger"
        isLoading={remove.isPending}
      />
    </div>
  );
}
