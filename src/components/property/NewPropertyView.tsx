"use client";

import { useRouter } from "next/navigation";

import {
  Container,
  Section,
  SectionHeading,
} from "@/components/layout/Container";
import { PropertyForm } from "@/components/property/PropertyForm";
import { toast } from "@/components/ui";
import { useCreateProperty } from "@/hooks/useProperties";

/**
 * Add a listing.
 *
 * A new listing is saved as a DRAFT — the server decides that, and no request
 * from here can make it anything else. Sending it for review is a separate,
 * deliberate step from the properties list, so filling this in halfway does not
 * put an incomplete listing in front of students.
 *
 * Shared by the landlord and lawyer surfaces. `onBehalfOfOwner` is the only real
 * difference: it makes the published contact details required, because the
 * server's blank-contact fallback uses the *creating account*, which is right for
 * a landlord and wrong for a lawyer.
 */
export interface NewPropertyViewProps {
  eyebrow: string;
  title: string;
  lead: string;
  /** Where Cancel returns to, and where a successful save lands. */
  listHref: string;
  onBehalfOfOwner?: boolean;
}

export function NewPropertyView({
  eyebrow,
  title,
  lead,
  listHref,
  onBehalfOfOwner = false,
}: NewPropertyViewProps) {
  const router = useRouter();
  const create = useCreateProperty();

  return (
    <main id="main">
      <Section>
        <Container size="narrow" className="flex flex-col gap-8">
          <SectionHeading eyebrow={eyebrow} title={title} lead={lead} align="left" />

          <PropertyForm
            isPending={create.isPending}
            error={create.error}
            errorTitle="Couldn't save this listing"
            submitLabel="Save as draft"
            pendingLabel="Saving…"
            cancelHref={listHref}
            onBehalfOfOwner={onBehalfOfOwner}
            onSubmit={(payload) =>
              create.mutate(payload, {
                onSuccess: (property) => {
                  toast.success("Draft saved", {
                    description: `"${property.title}" is saved. Add photos, then send it for review.`,
                  });
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
