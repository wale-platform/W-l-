"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldAlert } from "lucide-react";

import {
  Container,
  Section,
  SectionHeading,
} from "@/components/layout/Container";
import {
  PropertyForm,
  propertyFormValuesFrom,
} from "@/components/property/PropertyForm";
import { Alert, Button, ErrorState, Skeleton, toast } from "@/components/ui";
import { useMyProperty, useUpdateProperty } from "@/hooks/useProperties";
import { messageFrom, statusOf } from "@/lib/api/field-errors";

/**
 * Edit a listing.
 *
 * Loaded from `GET /properties/mine/:id`, which is scoped to the caller on the
 * server — a listing belonging to someone else comes back as 404, deliberately
 * indistinguishable from one that does not exist, so this page cannot be used to
 * probe for other people's unpublished listings.
 *
 * Shared by the landlord and lawyer surfaces; see NewPropertyView for what
 * `onBehalfOfOwner` changes.
 */
export interface EditPropertyViewProps {
  propertyId: string;
  /** Where Cancel returns to, and where a successful save lands. */
  listHref: string;
  listLabel: string;
  onBehalfOfOwner?: boolean;
}

export function EditPropertyView({
  propertyId,
  listHref,
  listLabel,
  onBehalfOfOwner = false,
}: EditPropertyViewProps) {
  const router = useRouter();
  const query = useMyProperty(propertyId);
  const update = useUpdateProperty(propertyId);

  if (query.isPending) {
    return (
      <main>
        <Section>
          <Container size="narrow" className="flex flex-col gap-6" aria-busy="true">
            <Skeleton className="h-16" />
            <Skeleton className="h-96" />
          </Container>
        </Section>
      </main>
    );
  }

  if (query.isError) {
    const missing = statusOf(query.error) === 404;

    return (
      <main>
        <Section>
          <Container size="narrow">
            <ErrorState
              title={missing ? "We couldn't find that listing" : "Couldn't load that listing"}
              description={
                missing
                  ? "It may have been deleted, or it belongs to another account."
                  : messageFrom(query.error, "Check your connection and try again.")
              }
              action={
                <Link href={listHref}>
                  <Button tone="outline">{listLabel}</Button>
                </Link>
              }
            />
          </Container>
        </Section>
      </main>
    );
  }

  const property = query.data;
  const isLive = property.status === "VERIFIED";

  return (
    <main>
      <Section>
        <Container size="narrow" className="flex flex-col gap-8">
          <SectionHeading
            eyebrow="Properties"
            title="Edit property"
            lead={`Updating "${property.title}".`}
            align="left"
          />

          {/* The server resets a VERIFIED listing to PENDING_VERIFICATION on
              edit — otherwise "get approved, then rewrite it" would launder any
              content into a verified badge. Say so before they start typing
              rather than after they hit save. */}
          {isLive && (
            <Alert
              tone="warning"
              title="Editing this withdraws the verified badge"
              icon={<ShieldAlert aria-hidden="true" className="size-4" />}
            >
              This listing is verified and live. Saving changes sends it back for
              review, and the badge comes off until our team has checked it again.
              Students can still see the listing in the meantime.
            </Alert>
          )}

          <PropertyForm
            defaultValues={propertyFormValuesFrom(property)}
            isPending={update.isPending}
            error={update.error}
            errorTitle="Couldn't save your changes"
            submitLabel="Save changes"
            pendingLabel="Saving…"
            cancelHref={listHref}
            onBehalfOfOwner={onBehalfOfOwner}
            onSubmit={(payload) =>
              update.mutate(payload, {
                onSuccess: (saved) => {
                  // Report what actually happened, read off the response rather
                  // than assumed: the status the server returns is the truth
                  // about whether the badge survived.
                  if (isLive && saved.status === "PENDING_VERIFICATION") {
                    toast.success("Changes saved — back in review", {
                      description:
                        "The verified badge is off until our team checks the new details.",
                    });
                  } else {
                    toast.success("Changes saved");
                  }
                  router.push(listHref);
                },
              })
            }
          />
        </Container>
      </Section>
    </main>
  );
}
