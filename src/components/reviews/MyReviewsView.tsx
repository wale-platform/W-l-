"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  CalendarRange,
  History,
  ImageOff,
  MapPin,
  MessageSquareQuote,
  Pencil,
  ShieldCheck,
  ShieldQuestion,
} from "lucide-react";

import { Container, Section, SectionHeading } from "@/components/layout/Container";
import { RatingStars } from "@/components/reviews/RatingStars";
import {
  ReviewFormModal,
  reviewTargetKey,
  type ReviewTarget,
} from "@/components/reviews/ReviewFormModal";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  EmptyState,
  ErrorState,
  Pagination,
  Skeleton,
} from "@/components/ui";
import { useMyReviews } from "@/hooks/useReviews";
import { messageFrom } from "@/lib/api/field-errors";
import {
  RATING_CRITERIA,
  reviewStatusCopy,
  type MyReview,
} from "@/lib/api/schemas";
import { formatDate, formatDateOnly } from "@/lib/utils/format";

/**
 * Everything this person has written, including what an admin has taken down.
 *
 * HIDDEN AND REMOVED REVIEWS ARE SHOWN HERE. Nowhere else — a moderated review is gone
 * from the listing page and out of every average — but the person who wrote it is told
 * plainly that it happened, rather than being left to wonder why their words vanished.
 * They cannot be edited back into existence; the server refuses, and this page does not
 * offer the button.
 *
 * The exact dates are the ones this person gave. Coarsening move-in to a month is a
 * protection for the author against strangers on the listing page, which makes it
 * pointless here, where the author is the reader.
 *
 * This is the only place a review can be edited. The residence history links here
 * instead of opening the form itself, because a claim row carries no copy of the words
 * or the scores and a form seeded from nothing would blank somebody's review.
 */
export function MyReviewsView() {
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<MyReview | null>(null);

  const query = useMyReviews({ page });
  const reviews = query.data?.reviews ?? [];

  const target: ReviewTarget | null = editing
    ? { kind: "existing", review: editing }
    : null;

  return (
    <main id="main">
      <Section>
        <Container size="wide" className="flex flex-col gap-8">
          <SectionHeading
            eyebrow="Your reviews"
            title="What you've said about where you lived"
            lead="Readers see your first name and last initial and the month you moved in — never your full name or the exact day. You can revise anything you have written."
            align="left"
          />

          {query.isPending && (
            <div aria-busy="true" className="flex flex-col gap-4">
              <Skeleton className="h-48" />
              <Skeleton className="h-48" />
            </div>
          )}

          {query.isError && (
            <ErrorState
              title="Couldn't load your reviews"
              description={messageFrom(query.error, "Check your connection and try again.")}
              action={
                <Button tone="outline" onClick={() => void query.refetch()}>
                  Try again
                </Button>
              }
            />
          )}

          {query.isSuccess && reviews.length === 0 && (
            <EmptyState
              icon={<MessageSquareQuote aria-hidden="true" className="size-5" />}
              title="You haven't reviewed anywhere yet"
              description="Reviews start from your residence history: add a place you have rented, and you can write about it from there."
              action={
                <Link href="/tenant/residences">
                  <Button>
                    <History aria-hidden="true" className="size-4" />
                    Go to your residence history
                  </Button>
                </Link>
              }
            />
          )}

          {reviews.length > 0 && (
            <div className="flex flex-col gap-4">
              {reviews.map((review) => (
                <MyReviewCard
                  key={review.id}
                  review={review}
                  onEdit={() => setEditing(review)}
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

      {target && (
        <ReviewFormModal
          key={reviewTargetKey(target)}
          target={target}
          onClose={() => setEditing(null)}
        />
      )}
    </main>
  );
}

/* ------------------------------------------------------------------ one review -- */

/** "September 2024 – August 2025", or "– present" while the tenancy is live. */
function period(review: MyReview): string {
  const from = formatDateOnly(review.residedFrom);
  return review.residedTo ? `${from} – ${formatDateOnly(review.residedTo)}` : `${from} – present`;
}

/**
 * Whether this has actually been revised since it was written.
 *
 * The same one-second tolerance the server applies before telling readers a review was
 * edited. Prisma stamps `createdAt` and `updatedAt` in the same write, and comparing the
 * two strings for equality would put "edited" on reviews nobody has touched whenever
 * those two stamps land a millisecond apart.
 */
function wasEdited(review: MyReview): boolean {
  return (
    new Date(review.updatedAt).getTime() - new Date(review.createdAt).getTime() > 1_000
  );
}

function MyReviewCard({ review, onEdit }: { review: MyReview; onEdit: () => void }) {
  const status = reviewStatusCopy[review.status];
  const cover = review.property.image;
  // The server refuses to edit anything an admin has acted on, so the button is not
  // offered for those — an edit that came back 409 would be a worse way to say it.
  const editable = review.status === "PUBLISHED";

  return (
    <Card>
      <CardBody className="flex flex-col gap-4 sm:flex-row">
        <Link
          href={`/properties/${review.property.id}`}
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
                  href={`/properties/${review.property.id}`}
                  className="underline-offset-4 hover:text-brand-700 hover:underline"
                >
                  {review.property.title}
                </Link>
              </h3>
              <p className="flex items-center gap-1.5 text-sm text-ink-500">
                <MapPin aria-hidden="true" className="size-3.5 shrink-0" />
                {review.property.address}, {review.property.city}, {review.property.state}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {review.verified ? (
                <Badge tone="success">
                  <ShieldCheck aria-hidden="true" className="size-3" />
                  Counts as verified
                </Badge>
              ) : (
                <Badge tone="warning">
                  <ShieldQuestion aria-hidden="true" className="size-3" />
                  Not yet confirmed
                </Badge>
              )}
              {/* Only worth saying when it is not the ordinary case. */}
              {review.status !== "PUBLISHED" && (
                <Badge tone={status.tone}>{status.label}</Badge>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
            <span className="flex items-center gap-2">
              <RatingStars value={review.ratings.overall} />
              <span className="font-medium text-ink-800">{review.ratings.overall}/5</span>
            </span>
            <span className="flex items-center gap-1.5 text-ink-700">
              <CalendarRange aria-hidden="true" className="size-3.5 shrink-0 text-ink-400" />
              {period(review)}
            </span>
          </div>

          <p className="whitespace-pre-line leading-relaxed text-ink-700">{review.body}</p>

          <dl className="flex flex-wrap gap-x-6 gap-y-2 border-t border-ink-100 pt-3">
            {RATING_CRITERIA.filter((criterion) => criterion.key !== "overall").map(
              ({ key, label }) => (
                <div key={key} className="flex items-center gap-2">
                  <dt className="text-xs text-ink-500">{label}</dt>
                  <dd>
                    <RatingStars value={review.ratings[key]} size="sm" />
                  </dd>
                </div>
              ),
            )}
          </dl>

          {/* Said in full, not as a badge on its own. Somebody whose review has been
              taken down deserves to know what that means for them. */}
          {review.status === "HIDDEN" && (
            <Alert tone="warning" title="An admin has hidden this">
              It is no longer shown on the listing and no longer counts towards the
              rating. It cannot be edited while it is hidden. If you think that was a
              mistake, get in touch and say which property it was about.
            </Alert>
          )}

          {review.status === "REMOVED" && (
            <Alert tone="danger" title="An admin has taken this down">
              It is off the listing for good and does not count towards the rating. It
              is kept here so you know what happened to it.
            </Alert>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <p className="text-xs text-ink-500">
              Written {formatDate(review.createdAt)}
              {wasEdited(review) && ` · edited ${formatDate(review.updatedAt)}`}
            </p>
            <div className="flex flex-wrap gap-2">
              {editable && (
                <Button size="sm" tone="outline" onClick={onEdit}>
                  <Pencil aria-hidden="true" className="size-3.5" />
                  Edit
                </Button>
              )}
              <Link href={`/properties/${review.property.id}#reviews`}>
                <Button size="sm" tone="ghost">
                  See it on the listing
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
