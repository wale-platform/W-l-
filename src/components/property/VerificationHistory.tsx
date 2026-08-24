"use client";

import { propertyStatusCopy, type VerificationEntry } from "@/lib/api/schemas";
import { Skeleton } from "@/components/ui";
import { useVerificationHistory } from "@/hooks/useReviewQueue";

/**
 * Everything that has happened to one listing's status, newest first.
 *
 * The same component for both audiences, because it is the same record: a
 * landlord disputing a decision sees exactly what the reviewer sees. The server
 * decides who may read it (owner or admin, `ownedBy` in property.service.ts) and
 * strips the reviewer's email before it ever gets here.
 *
 * An entry with no actor is shown, not hidden. Decisions predating the audit
 * trail have nobody on record, and deleting an admin's account nulls the link
 * rather than erasing what they decided — in both cases the change still
 * happened, and dropping the row would misrepresent the history as shorter than
 * it is.
 */
export function VerificationHistory({ propertyId }: { propertyId: string }) {
  const query = useVerificationHistory(propertyId);

  if (query.isPending) {
    return (
      <div aria-busy="true" className="flex flex-col gap-3">
        <Skeleton className="h-14" />
        <Skeleton className="h-14" />
      </div>
    );
  }

  if (query.isError) {
    return <p className="text-sm text-ink-500">Couldn&apos;t load the history for this listing.</p>;
  }

  if (query.data.length === 0) {
    return (
      <p className="text-sm text-ink-500">
        Nothing recorded yet — this listing has not changed status since it was created.
      </p>
    );
  }

  return (
    <ol className="flex flex-col gap-4">
      {query.data.map((entry) => (
        <HistoryRow key={entry.id} entry={entry} />
      ))}
    </ol>
  );
}

function HistoryRow({ entry }: { entry: VerificationEntry }) {
  const to = propertyStatusCopy[entry.toStatus];
  const from = propertyStatusCopy[entry.fromStatus];

  return (
    <li className="flex flex-col gap-1 border-l-2 border-ink-200 pl-4">
      <p className="text-sm font-medium text-ink-900">
        {from.label} → {to.label}
      </p>

      <p className="text-xs text-ink-500">
        {formatWhen(entry.createdAt)}
        {entry.actor ? ` · ${entry.actor.name}` : ""}
      </p>

      {entry.reason && <p className="text-sm text-ink-700">{entry.reason}</p>}
    </li>
  );
}

/**
 * A timestamp a person can read, in Lagos time.
 *
 * Pinned to Africa/Lagos rather than the viewer's locale: an admin reviewing
 * from anywhere and the landlord reading the same row should be talking about
 * the same clock when they disagree about when something happened.
 */
function formatWhen(iso: string): string {
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Lagos",
  }).format(new Date(iso));
}
