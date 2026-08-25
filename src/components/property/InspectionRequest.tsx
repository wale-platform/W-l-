"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarCheck, CalendarClock, CalendarPlus, Info } from "lucide-react";

import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardTitle,
  FormField,
  Input,
  Skeleton,
  Textarea,
  toast,
} from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import {
  useCancelInspection,
  useMyInspectionFor,
  useRequestInspection,
} from "@/hooks/useInspections";
import { messageFrom } from "@/lib/api/field-errors";
import { createInspectionSchema, inspectionStatusCopy } from "@/lib/api/schemas";
import { formatDateTime, toDateTimeLocalValue } from "@/lib/utils/format";

/**
 * Asking to see a place, on the listing page.
 *
 * This is the one action the whole product turns on — nobody should rent a room
 * they have not stood in — so it sits directly under the rent and the phone
 * number rather than behind a dashboard.
 *
 * Three things it deliberately does NOT do:
 *
 *  - It never asks for money. The "inspection fee" is the advance-fee scam the
 *    safety note on this same page warns students about, so there is no field for
 *    one and no mention of one. See `inspection.service.ts`.
 *  - It does not decide who may ask. Signed-out visitors are sent to sign in and
 *    landlords are told to use a tenant account, but a landlord who ignores that
 *    and posts anyway is refused by the server, not by this component.
 *  - It does not guess at state. Whether the viewer has already asked comes from
 *    a per-viewer query, because the listing payload is public and cached and
 *    this answer is not.
 */

/** How long a person is given to pick from, matching the server's horizon. */
const HORIZON_DAYS = 90;

export function InspectionRequest({
  propertyId,
  propertyTitle,
}: {
  propertyId: string;
  propertyTitle: string;
}) {
  const { isAuthenticated, isLoading: authLoading, roles } = useAuth();

  // Only ask on behalf of someone who has a session — the endpoint requires one,
  // so calling it for a visitor would be a guaranteed 401 on every listing view.
  const existing = useMyInspectionFor(propertyId, isAuthenticated);
  const request = useRequestInspection();
  const cancel = useCancelInspection();

  const [open, setOpen] = useState(false);
  const [preferredAt, setPreferredAt] = useState("");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<{ preferredAt?: string; note?: string }>({});

  const now = new Date();
  const min = toDateTimeLocalValue(new Date(now.getTime() + 60 * 60 * 1000));
  const max = toDateTimeLocalValue(new Date(now.getTime() + HORIZON_DAYS * 86_400_000));

  function submit() {
    // `datetime-local` gives "2026-09-05T10:00" with no zone, which the schema's
    // `.datetime({ offset: true })` rightly refuses. Interpreting it as the
    // person's own local time is the only reading that matches what they saw in
    // the field, and `toISOString` then makes the offset explicit on the wire.
    const local = preferredAt ? new Date(preferredAt) : null;
    const parsed = createInspectionSchema.safeParse({
      preferredAt: local && !Number.isNaN(local.getTime()) ? local.toISOString() : "",
      ...(note.trim() ? { note: note.trim() } : {}),
    });

    if (!parsed.success) {
      const next: { preferredAt?: string; note?: string } = {};
      for (const issue of parsed.error.issues) {
        if (issue.path[0] === "preferredAt") next.preferredAt = issue.message;
        if (issue.path[0] === "note") next.note = issue.message;
      }
      // A blank field fails as an invalid datetime, which is not what a person
      // needs to read about a box they have not filled in.
      setErrors({
        ...next,
        ...(preferredAt ? {} : { preferredAt: "Pick a date and time for the viewing" }),
      });
      return;
    }

    request.mutate(
      {
        propertyId,
        preferredAt: parsed.data.preferredAt,
        ...(parsed.data.note ? { note: parsed.data.note } : {}),
      },
      {
        onSuccess: (inspection) => {
          setOpen(false);
          setPreferredAt("");
          setNote("");
          setErrors({});
          toast.success("Request sent", {
            description: `The landlord has been emailed about ${formatDateTime(
              inspection.preferredAt,
            )}. You'll hear back here.`,
          });
        },
        onError: (error) =>
          toast.error("Couldn't send that request", { description: messageFrom(error) }),
      },
    );
  }

  /* ------------------------------------------------------ not signed in -- */

  if (authLoading) {
    return (
      <Card>
        <CardBody aria-busy="true">
          <Skeleton className="h-24" />
        </CardBody>
      </Card>
    );
  }

  if (!isAuthenticated) {
    return (
      <Card>
        <CardBody className="flex flex-col gap-3">
          <CardTitle>See it in person</CardTitle>
          <p className="text-sm text-ink-600">
            Book a viewing and the landlord gets your request by email. Sign in
            first — a viewing needs a name and a way to reach you.
          </p>
          <Link
            href={`/login?next=${encodeURIComponent(`/properties/${propertyId}`)}`}
            className="w-full"
          >
            <Button block>
              <CalendarPlus aria-hidden="true" className="size-4" />
              Sign in to book a viewing
            </Button>
          </Link>
        </CardBody>
      </Card>
    );
  }

  /* ------------------------------ signed in, but not as someone who asks -- */

  // A landlord's request would land in their own queue, and the server refuses
  // it. Saying so is more useful than a button that 403s.
  const canAsk = roles.some((role) => role === "TENANT" || role === "MOVER" || role === "ADMIN");

  if (!canAsk) {
    return (
      <Card>
        <CardBody className="flex flex-col gap-3">
          <CardTitle>See it in person</CardTitle>
          <p className="text-sm text-ink-600">
            Viewings are booked from a tenant account. If you are house-hunting as
            well as letting, add the tenant role to this account from your profile.
          </p>
          <Link href="/profile" className="w-full">
            <Button block tone="outline">
              Manage your roles
            </Button>
          </Link>
        </CardBody>
      </Card>
    );
  }

  /* ----------------------------------------------- already asked, or not -- */

  if (existing.isPending) {
    return (
      <Card>
        <CardBody aria-busy="true">
          <Skeleton className="h-24" />
        </CardBody>
      </Card>
    );
  }

  const live = existing.data;

  if (live) {
    const { label, tone } = inspectionStatusCopy[live.status];

    return (
      <Card>
        <CardBody className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>Your viewing</CardTitle>
            <Badge tone={tone}>{label}</Badge>
          </div>

          <p className="flex items-start gap-2 text-sm text-ink-700">
            {live.status === "CONFIRMED" ? (
              <CalendarCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-success" />
            ) : (
              <CalendarClock aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-warning" />
            )}
            <span>
              {live.status === "CONFIRMED"
                ? "Confirmed for "
                : "You asked to come at "}
              <span className="font-medium text-ink-900">
                {formatDateTime(live.preferredAt)}
              </span>
            </span>
          </p>

          {live.response && (
            <Alert tone={live.status === "CONFIRMED" ? "success" : "info"} title="From the landlord">
              {live.response}
            </Alert>
          )}

          {live.status === "REQUESTED" && (
            <p className="text-xs leading-relaxed text-ink-500">
              The landlord has been emailed. You will see their answer here, and
              they get your phone number only once they confirm.
            </p>
          )}

          <Button
            tone="outline"
            block
            isLoading={cancel.isPending}
            onClick={() =>
              cancel.mutate(live.id, {
                onSuccess: () =>
                  toast.success("Viewing cancelled", {
                    description: "The landlord will see it was called off.",
                  }),
                onError: (error) =>
                  toast.error("Couldn't cancel that", { description: messageFrom(error) }),
              })
            }
          >
            {live.status === "CONFIRMED" ? "Cancel this viewing" : "Withdraw my request"}
          </Button>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardBody className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <CardTitle>See it in person</CardTitle>
          <p className="text-sm text-ink-500">
            Pick a time that suits you. The landlord replies with a yes, a no, or
            another time.
          </p>
        </div>

        {open ? (
          <div className="flex flex-col gap-4">
            <FormField
              label="When would you like to come?"
              hint="Any time in the next 90 days. Use the landlord's own hours if you know them."
              error={errors.preferredAt}
              required
            >
              {(field) => (
                <Input
                  {...field}
                  type="datetime-local"
                  min={min}
                  max={max}
                  value={preferredAt}
                  onChange={(event) => {
                    setPreferredAt(event.target.value);
                    if (errors.preferredAt) setErrors((e) => ({ ...e, preferredAt: undefined }));
                  }}
                />
              )}
            </FormField>

            <FormField
              label="Anything they should know? (optional)"
              hint="Short and practical — “I can only do mornings”, not a message thread."
              error={errors.note}
            >
              {(field) => (
                <Textarea
                  {...field}
                  rows={3}
                  maxLength={500}
                  value={note}
                  onChange={(event) => {
                    setNote(event.target.value);
                    if (errors.note) setErrors((e) => ({ ...e, note: undefined }));
                  }}
                  placeholder="I'm free most mornings before 11."
                />
              )}
            </FormField>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button block isLoading={request.isPending} onClick={submit}>
                Send request
              </Button>
              <Button
                block
                tone="ghost"
                disabled={request.isPending}
                onClick={() => {
                  setOpen(false);
                  setErrors({});
                }}
              >
                Not now
              </Button>
            </div>

            <p className="flex items-start gap-2 text-xs leading-relaxed text-ink-500">
              <Info aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
              Booking a viewing costs nothing, here or at the gate. Nobody at WALE
              will ever ask you to pay to see a room.
            </p>
          </div>
        ) : (
          <Button block onClick={() => setOpen(true)}>
            <CalendarPlus aria-hidden="true" className="size-4" />
            Book a viewing
          </Button>
        )}

        {existing.isError && (
          <p className="text-xs text-ink-500">
            We couldn&apos;t check whether you have already asked about{" "}
            {propertyTitle}. Sending a request again is safe — a duplicate is
            refused rather than doubled up.
          </p>
        )}
      </CardBody>
    </Card>
  );
}
