"use client";

import { useState } from "react";
import Link from "next/link";
import { Home, Plus } from "lucide-react";

import {
  Container,
  Section,
  SectionHeading,
} from "@/components/layout/Container";
import { OwnerPropertyCard } from "@/components/property/OwnerPropertyCard";
import {
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Pagination,
  Select,
  Skeleton,
  toast,
} from "@/components/ui";
import {
  useDeleteProperty,
  useMyProperties,
  useSubmitProperty,
} from "@/hooks/useProperties";
import { messageFrom } from "@/lib/api/field-errors";
import {
  propertyStatusCopy,
  propertyStatusSchema,
  type OwnerProperty,
  type PropertyStatus,
} from "@/lib/api/schemas";

/**
 * Listings belonging to whoever is signed in, from `GET /properties/mine`.
 *
 * A separate endpoint from the public catalogue, not a filter on it: this view
 * shows DRAFT and REJECTED listings, which no shopper may ever see, and the
 * server decides that rather than trusting a query parameter.
 *
 * Shared by the landlord and lawyer dashboards, which differ only in wording and
 * where their links point — the state machine, the actions, and what the server
 * allows are identical, because they are the same endpoint.
 *
 * Every action here is a request the backend authorizes independently —
 * ownership is a WHERE clause on its side, so a listing that is not yours is
 * simply not found. Nothing on this page is a security boundary.
 */

const STATUS_OPTIONS = propertyStatusSchema.options;

export interface OwnerPropertiesViewProps {
  eyebrow: string;
  title: string;
  lead: string;
  /** Where the "add" button goes. */
  addHref: string;
  addLabel: string;
  editHref: (id: string) => string;
  /** Copy for having nothing at all; the filtered-empty state speaks for itself. */
  empty: { title: string; description: string; action: string };
}

export function OwnerPropertiesView({
  eyebrow,
  title,
  lead,
  addHref,
  addLabel,
  editHref,
  empty,
}: OwnerPropertiesViewProps) {
  const [status, setStatus] = useState<PropertyStatus | "">("");
  const [page, setPage] = useState(1);
  const [pendingDelete, setPendingDelete] = useState<OwnerProperty | null>(null);

  const query = useMyProperties({
    page,
    ...(status ? { status } : {}),
  });

  const submitForReview = useSubmitProperty();
  const remove = useDeleteProperty();

  const listings = query.data?.properties ?? [];

  function handleSubmitForReview(property: OwnerProperty) {
    submitForReview.mutate(property.id, {
      onSuccess: () =>
        toast.success("Sent for review", {
          description:
            "Students can see it now. The verified badge follows once our team has checked the details.",
        }),
      // The server refuses for real reasons — no photos, or already in review —
      // and says why in words. Surface that rather than a generic failure.
      onError: (error) =>
        toast.error("Couldn't send it for review", {
          description: messageFrom(error),
        }),
    });
  }

  function handleDelete(property: OwnerProperty) {
    remove.mutate(property.id, {
      onSuccess: () => {
        setPendingDelete(null);
        toast.success("Listing deleted", { description: `"${property.title}" is gone.` });
        // Deleting the last row of the last page would leave us past the end.
        if (listings.length === 1 && page > 1) setPage((p) => p - 1);
      },
      onError: (error) =>
        toast.error("Couldn't delete that listing", { description: messageFrom(error) }),
    });
  }

  return (
    <main>
      <Section>
        <Container size="wide" className="flex flex-col gap-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <SectionHeading eyebrow={eyebrow} title={title} lead={lead} align="left" />

            <Link href={addHref}>
              <Button>
                <Plus aria-hidden="true" className="size-4" />
                {addLabel}
              </Button>
            </Link>
          </div>

          <div className="flex flex-col gap-2 sm:max-w-xs">
            <label htmlFor="status-filter" className="text-sm font-medium text-ink-800">
              Filter by status
            </label>
            <Select
              id="status-filter"
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as PropertyStatus | "");
                setPage(1);
              }}
            >
              <option value="">All listings</option>
              {STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {propertyStatusCopy[option].label}
                </option>
              ))}
            </Select>
          </div>

          {query.isPending && (
            <div aria-busy="true" className="flex flex-col gap-4">
              <Skeleton className="h-44" />
              <Skeleton className="h-44" />
            </div>
          )}

          {query.isError && (
            <ErrorState
              title="Couldn't load your listings"
              description={messageFrom(query.error, "Check your connection and try again.")}
              action={
                <Button tone="outline" onClick={() => void query.refetch()}>
                  Try again
                </Button>
              }
            />
          )}

          {query.isSuccess && listings.length === 0 && (
            <EmptyState
              icon={<Home aria-hidden="true" className="size-5" />}
              title={status ? "Nothing in this state" : empty.title}
              description={
                status
                  ? "Try a different status, or clear the filter to see everything."
                  : empty.description
              }
              action={
                status ? (
                  <Button
                    tone="outline"
                    onClick={() => {
                      setStatus("");
                      setPage(1);
                    }}
                  >
                    Clear the filter
                  </Button>
                ) : (
                  <Link href={addHref}>
                    <Button>{empty.action}</Button>
                  </Link>
                )
              }
            />
          )}

          {listings.length > 0 && (
            <div className="grid gap-4 lg:grid-cols-2">
              {listings.map((property) => (
                <OwnerPropertyCard
                  key={property.id}
                  property={property}
                  editHref={editHref(property.id)}
                  isSubmitting={
                    submitForReview.isPending && submitForReview.variables === property.id
                  }
                  onSubmitForReview={() => handleSubmitForReview(property)}
                  onDelete={() => setPendingDelete(property)}
                />
              ))}
            </div>
          )}

          {query.data && (
            <Pagination
              page={query.data.page}
              totalPages={query.data.totalPages}
              onPageChange={setPage}
              className="justify-center"
            />
          )}
        </Container>
      </Section>

      <ConfirmDialog
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && handleDelete(pendingDelete)}
        title="Delete this listing?"
        description={
          pendingDelete
            ? `"${pendingDelete.title}" and its photos will be removed for good. This can't be undone.`
            : undefined
        }
        confirmLabel="Delete listing"
        tone="danger"
        isLoading={remove.isPending}
      />
    </main>
  );
}
