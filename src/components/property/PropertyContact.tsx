"use client";

import { useState } from "react";
import { Mail, Phone, ShieldCheck, TriangleAlert } from "lucide-react";

import { Alert, Button, Card, CardBody, CardTitle } from "@/components/ui";
import type { Property } from "@/lib/api/schemas";

/**
 * How to reach whoever is letting this place.
 *
 * The number is behind a tap rather than printed in the markup. This is NOT a
 * privacy control and is not presented as one — the public API returns the
 * contact with the listing, and the listing is serialized into this page's own
 * payload so the reveal costs no round trip, so anyone reading either has the
 * number regardless. What the tap buys is narrower and worth having anyway: no
 * `tel:` link and no phone number in the visible text, which is what a crawler
 * lifts into a search snippet and what the cheap scrapers actually read. And a
 * deliberate tap is a better signal of real interest than a page view.
 *
 * Keeping it genuinely private would mean an authenticated endpoint that hands
 * the number over only after the tap, and that is a different decision about who
 * is allowed to contact a landlord — not something to imply with a button.
 *
 * The safety note is not boilerplate. Advance-fee fraud on rentals is the single
 * most common way a Nigerian student loses money looking for a room: a "caution
 * fee" or "inspection fee" requested before anyone has seen the place. Saying so
 * on the page where the number appears is the moment it is worth saying.
 */
export function PropertyContact({ property }: { property: Property }) {
  const [revealed, setRevealed] = useState(false);
  const { name, phone, email } = property.landlord;

  return (
    <Card>
      <CardBody className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <CardTitle>Contact</CardTitle>
          <p className="text-sm text-ink-500">
            Listed by <span className="font-medium text-ink-800">{name}</span>
          </p>
        </div>

        {revealed ? (
          <div className="flex flex-col gap-2">
            <a
              href={`tel:${phone.replace(/\s+/g, "")}`}
              className="flex items-center gap-2 rounded-field bg-brand-50 px-4 py-3 text-base font-semibold text-brand-800 transition hover:bg-brand-100"
            >
              <Phone aria-hidden="true" className="size-4 shrink-0" />
              {phone}
            </a>

            {email && (
              <a
                href={`mailto:${email}`}
                className="flex items-center gap-2 break-all px-1 text-sm text-ink-600 underline-offset-4 hover:text-brand-700 hover:underline"
              >
                <Mail aria-hidden="true" className="size-4 shrink-0" />
                {email}
              </a>
            )}
          </div>
        ) : (
          <Button block onClick={() => setRevealed(true)}>
            <Phone aria-hidden="true" className="size-4" />
            Show phone number
          </Button>
        )}

        {property.verified ? (
          <p className="flex items-start gap-2 text-xs leading-relaxed text-ink-500">
            <ShieldCheck aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-success" />
            Our team has checked that this listing describes a real property at
            this address. That is not a guarantee about the person letting it.
          </p>
        ) : (
          <Alert tone="warning" title="Not verified yet">
            Nobody from WALE has been to this address. Be especially careful, and
            see it in person before you part with money.
          </Alert>
        )}

        <div className="flex items-start gap-2 border-t border-ink-100 pt-4 text-xs leading-relaxed text-ink-600">
          <TriangleAlert aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-warning" />
          <p>
            <span className="font-medium text-ink-800">Never pay to inspect.</span>{" "}
            No inspection fee, caution fee, or agreement fee should be paid before
            you have seen the place and met the landlord. If you are asked to
            transfer money to view a room, that is the sign to walk away.
          </p>
        </div>
      </CardBody>
    </Card>
  );
}
