"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  CalendarRange,
  Check,
  Clock,
  History,
  ImageOff,
  MapPin,
  MessageSquare,
  Plus,
  Search,
  ShieldCheck,
  Star,
} from "lucide-react";

import { Container, Section, SectionHeading } from "@/components/layout/Container";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  FormField,
  Input,
  Modal,
  Pagination,
  Select,
  Skeleton,
  Spinner,
  Textarea,
  toast,
} from "@/components/ui";
import { useProperties } from "@/hooks/useProperties";
import {
  useClaimResidence,
  useMyResidences,
  useWithdrawResidence,
} from "@/hooks/useResidences";
import { fieldErrorsFrom, messageFrom } from "@/lib/api/field-errors";
import {
  createResidenceSchema,
  residenceStatusCopy,
  residenceStatusSchema,
  type Property,
  type Residence,
  type ResidenceStatus,
} from "@/lib/api/schemas";
import { formatDateOnly, formatMonthYear } from "@/lib/utils/format";

/**
 * The places this person has lived, and where each claim has got to.
 *
 * This is the gate in front of the whole review domain: nobody can review a
 * property they have not recorded living in, and only a claim the property's owner
 * CONFIRMED counts towards that property's verified rating. So the page is honest
 * about the middle state — a claim awaiting the landlord is labelled as awaiting the
 * landlord, in those words, and never shown as verified.
 *
 * The claim form lives here rather than as a button on each listing page, because
 * somebody recording three past addresses should not have to find three listing
 * pages to do it. The cost is that the picker searches the public catalogue, so a
 * listing that has been suspended or rejected cannot be found through it — the
 * server would accept a claim against one by id, but there is no way to reach it
 * from here.
 *
 * A confirmed claim entitles its owner to write a review. The form for that arrives
 * with the review layer; until then this page says the entitlement exists rather
 * than offering a button that goes nowhere.
 */

const STATUS_OPTIONS = residenceStatusSchema.options;

/** Today as `YYYY-MM-DD`, for the date inputs' `max`. */
function todayInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}

export function MyResidencesView() {
  const [status, setStatus] = useState<ResidenceStatus | "">("");
  const [page, setPage] = useState(1);
  const [claiming, setClaiming] = useState(false);
  const [pendingWithdraw, setPendingWithdraw] = useState<Residence | null>(null);

  const query = useMyResidences({ ...(status ? { status } : {}), page });
  const withdraw = useWithdrawResidence();

  const residences = query.data?.residences ?? [];

  function handleWithdraw(residence: Residence) {
    withdraw.mutate(residence.id, {
      onSuccess: () => {
        setPendingWithdraw(null);
        toast.success("Claim withdrawn", {
          description: `"${residence.property.title}" is off your history and out of the owner's queue.`,
        });
        if (residences.length === 1 && page > 1) setPage((p) => p - 1);
      },
      onError: (error) =>
        toast.error("Couldn't withdraw that", { description: messageFrom(error) }),
    });
  }

  return (
    <main id="main">
      <Section>
        <Container size="wide" className="flex flex-col gap-8">
          <SectionHeading
            eyebrow="Residence history"
            title="Places you've lived"
            lead="Add a place and its landlord is asked to confirm you lived there. A confirmed stay is what lets you review it — and what makes your review count towards the rating other students see."
            align="left"
          />

          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-col gap-2 sm:min-w-56">
              <label htmlFor="residence-status" className="text-sm font-medium text-ink-800">
                Showing
              </label>
              <Select
                id="residence-status"
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value as ResidenceStatus | "");
                  setPage(1);
                }}
              >
                <option value="">Everything</option>
                {STATUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {residenceStatusCopy[option].label}
                  </option>
                ))}
              </Select>
            </div>

            <Button onClick={() => setClaiming(true)}>
              <Plus aria-hidden="true" className="size-4" />
              Add a place you lived
            </Button>
          </div>

          {query.isPending && (
            <div aria-busy="true" className="flex flex-col gap-4">
              <Skeleton className="h-44" />
              <Skeleton className="h-44" />
            </div>
          )}

          {query.isError && (
            <ErrorState
              title="Couldn't load your history"
              description={messageFrom(query.error, "Check your connection and try again.")}
              action={
                <Button tone="outline" onClick={() => void query.refetch()}>
                  Try again
                </Button>
              }
            />
          )}

          {query.isSuccess && residences.length === 0 && (
            <EmptyState
              icon={<History aria-hidden="true" className="size-5" />}
              title={
                status
                  ? `Nothing ${residenceStatusCopy[status].label.toLowerCase()}`
                  : "You haven't added anywhere yet"
              }
              description={
                status
                  ? "Change what you're showing to see the rest."
                  : "Add a place you have rented. Once the landlord confirms it, you can write the review you wish you had read before signing."
              }
              action={
                status ? undefined : (
                  <Button onClick={() => setClaiming(true)}>
                    <Plus aria-hidden="true" className="size-4" />
                    Add a place you lived
                  </Button>
                )
              }
            />
          )}

          {residences.length > 0 && (
            <div className="flex flex-col gap-4">
              {residences.map((residence) => (
                <ResidenceCard
                  key={residence.id}
                  residence={residence}
                  isBusy={withdraw.isPending && withdraw.variables === residence.id}
                  onWithdraw={() => setPendingWithdraw(residence)}
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

      {/* Mounted only while open, so the picker's search fires when somebody
          opens the form and the whole form is fresh each time. */}
      <ClaimResidenceModal open={claiming} onClose={() => setClaiming(false)} />

      <ConfirmDialog
        open={pendingWithdraw !== null}
        onClose={() => setPendingWithdraw(null)}
        onConfirm={() => pendingWithdraw && handleWithdraw(pendingWithdraw)}
        title="Withdraw this claim?"
        description={
          pendingWithdraw
            ? `It leaves the landlord's queue and your history. You can add "${pendingWithdraw.property.title}" again later — but only while nobody has decided on it, which is now.`
            : undefined
        }
        confirmLabel="Withdraw claim"
        tone="danger"
        isLoading={withdraw.isPending}
      />
    </main>
  );
}

/* ------------------------------------------------------------------ a claim -- */

/** "September 2024 – August 2025", or "– present" while the tenancy is live. */
function period(residence: Residence): string {
  const from = formatMonthYear(residence.movedInAt);
  return residence.movedOutAt ? `${from} – ${formatMonthYear(residence.movedOutAt)}` : `${from} – present`;
}

/** One claim, from the side of the person who made it. */
function ResidenceCard({
  residence,
  isBusy,
  onWithdraw,
}: {
  residence: Residence;
  isBusy: boolean;
  onWithdraw: () => void;
}) {
  const { label, tone } = residenceStatusCopy[residence.status];
  const cover = residence.property.image;
  // The only state the server will still let the claimant take back. A rejection
  // is deliberately not removable — that would be a clean slate to re-submit from.
  const withdrawable = residence.status === "UNVERIFIED";

  return (
    <Card>
      <CardBody className="flex flex-col gap-4 sm:flex-row">
        <Link
          href={`/properties/${residence.property.id}`}
          className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-field bg-ink-100 sm:w-40"
        >
          {cover ? (
            <Image
              src={cover}
              alt=""
              fill
              sizes="(min-width: 640px) 10rem, 100vw"
              className="object-cover"
            />
          ) : (
            <div className="flex size-full items-center justify-center text-ink-400">
              <ImageOff aria-hidden="true" className="size-6" />
            </div>
          )}
        </Link>

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="flex min-w-0 flex-col gap-1">
              <h3 className="text-base font-semibold text-ink-900">
                <Link
                  href={`/properties/${residence.property.id}`}
                  className="underline-offset-4 hover:text-brand-700 hover:underline"
                >
                  {residence.property.title}
                </Link>
              </h3>
              <p className="flex items-center gap-1.5 text-sm text-ink-500">
                <MapPin aria-hidden="true" className="size-3.5 shrink-0" />
                {residence.property.address}, {residence.property.city},{" "}
                {residence.property.state}
              </p>
            </div>
            <Badge tone={tone} className="whitespace-nowrap">
              {label}
            </Badge>
          </div>

          <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-700">
            <span className="flex items-center gap-1.5 font-medium text-ink-900">
              <CalendarRange aria-hidden="true" className="size-3.5 shrink-0 text-ink-400" />
              {period(residence)}
            </span>
            <span className="text-ink-500">
              Moved in {formatDateOnly(residence.movedInAt)}
            </span>
          </div>

          {residence.note && (
            <p className="flex items-start gap-2 rounded-field bg-ink-50 px-3 py-2 text-sm text-ink-700">
              <MessageSquare aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-ink-400" />
              <span className="whitespace-pre-line">
                <span className="font-medium text-ink-800">You said: </span>
                {residence.note}
              </span>
            </p>
          )}

          {/* Their words, verbatim. A rejection is only useful if the reason
              survives the trip — it is the difference between "you picked the
              wrong flat off the search page" and "I don't believe you". */}
          {residence.status === "REJECTED" && (
            <Alert tone="warning" title="The landlord didn't accept this">
              {residence.decisionReason ??
                "No reason was given. If you think this is a mistake, check you picked the right listing."}
            </Alert>
          )}

          {residence.status === "UNVERIFIED" && (
            <p className="flex items-center gap-1.5 text-xs leading-relaxed text-ink-500">
              <Clock aria-hidden="true" className="size-3.5 shrink-0" />
              Waiting on the landlord — they have been emailed. Listings with no
              account behind them have nobody to confirm them.
            </p>
          )}

          {/* Confirmed is the only state that entitles a review, and the only one
              whose review counts towards the property's verified rating. */}
          {residence.status === "CONFIRMED" && (
            <p
              className={
                "flex items-center gap-1.5 rounded-field px-3 py-2 text-sm " +
                (residence.hasReview
                  ? "bg-ink-50 text-ink-700"
                  : "bg-brand-50 font-medium text-brand-800")
              }
            >
              {residence.hasReview ? (
                <>
                  <Check aria-hidden="true" className="size-3.5 shrink-0" />
                  You have reviewed this place. Your rating counts as verified.
                </>
              ) : (
                <>
                  <Star aria-hidden="true" className="size-3.5 shrink-0" />
                  Confirmed — you can review this place, and your rating will count
                  as verified.
                </>
              )}
            </p>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            {withdrawable && (
              <Button size="sm" tone="outline" onClick={onWithdraw} disabled={isBusy}>
                Withdraw claim
              </Button>
            )}
            <Link href={`/properties/${residence.property.id}`}>
              <Button size="sm" tone="ghost">
                View listing
              </Button>
            </Link>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

/* ------------------------------------------------------------- the new claim -- */

/**
 * Recording a place you lived.
 *
 * The dates are calendar dates, and `movedOutAt` empty is a real answer that means
 * "still living here" — six months into a tenancy you know about the water supply.
 * The schema is the server's, restated, so a typo'd year lands on the field instead
 * of coming back as a rejected request.
 *
 * The note is the field that makes a claim recognisable to somebody who let the
 * place three years ago, which is why the copy asks for a detail rather than
 * describing the field.
 */
function ClaimResidenceModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const claim = useClaimResidence();

  const [property, setProperty] = useState<Property | null>(null);
  const [movedInAt, setMovedInAt] = useState("");
  const [movedOutAt, setMovedOutAt] = useState("");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  function reset() {
    setProperty(null);
    setMovedInAt("");
    setMovedOutAt("");
    setNote("");
    setErrors({});
  }

  function close() {
    reset();
    onClose();
  }

  function submit() {
    const parsed = createResidenceSchema.safeParse({
      propertyId: property?.id ?? "",
      movedInAt,
      movedOutAt,
      note,
    });

    if (!parsed.success) {
      setErrors(
        Object.fromEntries(
          parsed.error.issues.map((issue) => [String(issue.path[0] ?? "form"), issue.message]),
        ),
      );
      return;
    }

    setErrors({});
    claim.mutate(parsed.data, {
      onSuccess: (created) => {
        close();
        toast.success("Added to your history", {
          description: created.property.title
            ? `The landlord of "${created.property.title}" has been asked to confirm it.`
            : "The landlord has been asked to confirm it.",
        });
      },
      onError: (error) => {
        // A 422 should be unreachable — the schema above is the server's — but a
        // conflict is routine ("you already recorded this", "too many waiting"),
        // and it belongs on the form rather than in a toast the person has to
        // remember while they fix it.
        const fields = fieldErrorsFrom(error);
        if (fields.length > 0) {
          setErrors(Object.fromEntries(fields.map((f) => [f.field, f.message])));
        } else {
          setErrors({ form: messageFrom(error) });
        }
      },
    });
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="Add a place you lived"
      description="The landlord is asked to confirm it. Nothing is published as verified until they do."
      footer={
        <>
          <Button tone="outline" onClick={close} disabled={claim.isPending}>
            Cancel
          </Button>
          <Button onClick={submit} isLoading={claim.isPending}>
            Add to my history
          </Button>
        </>
      }
    >
      {open && (
        <div className="flex flex-col gap-4">
          {errors.form && <Alert tone="danger">{errors.form}</Alert>}

          <PropertyPicker
            selected={property}
            onSelect={(next) => {
              setProperty(next);
              setErrors((prev) => {
                if (!prev.propertyId) return prev;
                const next = { ...prev };
                delete next.propertyId;
                return next;
              });
            }}
            error={errors.propertyId}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Moved in"
              required
              hint="Roughly is fine — the month is what matters."
              error={errors.movedInAt}
            >
              {(field) => (
                <Input
                  {...field}
                  type="date"
                  max={todayInputValue()}
                  value={movedInAt}
                  onChange={(event) => setMovedInAt(event.target.value)}
                />
              )}
            </FormField>

            <FormField
              label="Moved out"
              hint="Leave empty if you still live there."
              error={errors.movedOutAt}
            >
              {(field) => (
                <Input
                  {...field}
                  type="date"
                  max={todayInputValue()}
                  value={movedOutAt}
                  onChange={(event) => setMovedOutAt(event.target.value)}
                />
              )}
            </FormField>
          </div>

          <FormField
            label="Anything that will jog their memory (optional)"
            hint="“Flat 3 upstairs, my brother helped me move in.” The landlord reads this when they decide."
            error={errors.note}
          >
            {(field) => (
              <Textarea
                {...field}
                rows={3}
                maxLength={500}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Flat 3 upstairs — I paid through your agent Musa."
              />
            )}
          </FormField>

          <p className="flex items-start gap-2 text-xs leading-relaxed text-ink-500">
            <ShieldCheck aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
            The landlord sees your name, these dates and your note. They are not given
            your phone number or email.
          </p>
        </div>
      )}
    </Modal>
  );
}

/**
 * Choosing which listing this claim is about.
 *
 * Searches the public catalogue, which is what limits this form: a listing that has
 * been suspended or rejected is not in those results, though the server would accept
 * a claim against one by id. Someone in that position has no route through this
 * screen — recorded as a known gap rather than papered over with a free-text box,
 * because a claim against a property that does not exist is worth nothing to anybody.
 */
function PropertyPicker({
  selected,
  onSelect,
  error,
}: {
  selected: Property | null;
  onSelect: (property: Property | null) => void;
  error?: string;
}) {
  const [term, setTerm] = useState("");
  // Only searched on submit, not per keystroke: this sits inside a dialog next to
  // three other fields, and a list reordering itself under the cursor while
  // somebody types an address is worse than pressing a button.
  const [submitted, setSubmitted] = useState("");

  const query = useProperties({ ...(submitted ? { query: submitted } : {}), pageSize: 6 });
  const results = query.data?.properties ?? [];

  if (selected) {
    return (
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink-800">The place you lived</span>
        <div className="flex items-center gap-3 rounded-field border border-brand-200 bg-brand-50/60 p-3">
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-semibold text-ink-900">
              {selected.title}
            </span>
            <span className="truncate text-xs text-ink-600">
              {selected.address}, {selected.city}, {selected.state}
            </span>
          </div>
          <Button size="sm" tone="ghost" onClick={() => onSelect(null)}>
            Change
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <FormField
        label="Which place did you live in?"
        required
        hint="Search by name, address or area. It has to be a listing on WALE."
        error={error}
      >
        {(field) => (
          <div className="flex gap-2">
            <Input
              {...field}
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  // Inside a <dialog>: without this, Enter submits the form and
                  // the claim is sent before a listing has been chosen.
                  event.preventDefault();
                  setSubmitted(term.trim());
                }
              }}
              placeholder="Sunny studio, Akoka Road…"
              leading={<Search aria-hidden="true" className="size-4" />}
            />
            <Button tone="outline" onClick={() => setSubmitted(term.trim())}>
              Search
            </Button>
          </div>
        )}
      </FormField>

      <div className="flex max-h-64 flex-col gap-1.5 overflow-y-auto">
        {query.isPending && (
          <p aria-busy="true" className="flex items-center gap-2 p-2 text-sm text-ink-500">
            <Spinner className="size-4" />
            Searching…
          </p>
        )}

        {query.isError && (
          <p role="alert" className="p-2 text-sm text-danger">
            {messageFrom(query.error, "Couldn't search listings. Try again.")}
          </p>
        )}

        {query.isSuccess && results.length === 0 && (
          <p className="p-2 text-sm text-ink-500">
            Nothing matched. Try the street or the area on its own — the listing has to
            be on WALE for its landlord to be asked about it.
          </p>
        )}

        {results.map((result) => (
          <button
            key={result.id}
            type="button"
            onClick={() => onSelect(result)}
            className="flex items-center gap-3 rounded-field border border-ink-200 p-2 text-left transition-colors hover:border-brand-300 hover:bg-brand-50/60"
          >
            <div className="relative size-12 shrink-0 overflow-hidden rounded bg-ink-100">
              {result.images[0] ? (
                <Image src={result.images[0]} alt="" fill sizes="3rem" className="object-cover" />
              ) : (
                <div className="flex size-full items-center justify-center text-ink-400">
                  <ImageOff aria-hidden="true" className="size-4" />
                </div>
              )}
            </div>
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-medium text-ink-900">{result.title}</span>
              <span className="truncate text-xs text-ink-500">
                {result.address}, {result.city}, {result.state}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
