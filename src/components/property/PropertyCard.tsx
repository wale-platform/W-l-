import Link from "next/link";
import Image from "next/image";
import { MapPin, BedDouble, Bath, CalendarDays } from "lucide-react";
import { Card, Badge, VerifiedBadge, Skeleton } from "@/components/ui";
import {
  formatRent,
  formatDate,
  formatPropertyType,
  universityName,
} from "@/lib/utils/format";
import type { Property } from "@/lib/api/schemas";

/**
 * Listing card. Used on the home page and (in pass 3) the search results
 * grid, so layout is driven entirely by the parent's grid — the card
 * itself is width-agnostic.
 */
export function PropertyCard({ property }: { property: Property }) {
  const uni = universityName(property.university);

  return (
    <Card interactive className="group flex flex-col overflow-hidden">
      <div className="relative aspect-[4/3] overflow-hidden bg-ink-100">
        <Image
          src={property.images[0]}
          alt={property.title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transition-transform duration-500 ease-out-soft group-hover:scale-[1.03]"
        />

        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {property.verified && <VerifiedBadge size="sm" />}
          {uni && (
            <Badge size="sm" tone="outline" className="bg-white/95 backdrop-blur">
              {uni}
            </Badge>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex flex-col gap-1">
          <h3 className="font-semibold leading-snug text-ink-900">
            {/* Stretched link: the whole card is the hit target, but only
                the title text is announced as the link. */}
            <Link href={`/properties/${property.id}`} className="before:absolute before:inset-0">
              {property.title}
            </Link>
          </h3>

          <p className="flex items-center gap-1.5 text-sm text-ink-500">
            <MapPin aria-hidden="true" className="size-3.5 shrink-0" />
            <span className="truncate">
              {property.address}, {property.city}
            </span>
          </p>
        </div>

        <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-ink-600">
          <li className="flex items-center gap-1.5">
            <BedDouble aria-hidden="true" className="size-4 text-ink-400" />
            {formatPropertyType(property.type)}
          </li>
          <li className="flex items-center gap-1.5">
            <Bath aria-hidden="true" className="size-4 text-ink-400" />
            {property.bathrooms} bath
          </li>
        </ul>

        <p className="flex items-center gap-1.5 text-sm text-ink-500">
          <CalendarDays aria-hidden="true" className="size-3.5 shrink-0" />
          Available {formatDate(property.availableDate)}
        </p>

        <p className="mt-auto pt-2 text-lg font-semibold text-brand-800">
          {formatRent(property.price)}
        </p>
      </div>
    </Card>
  );
}

export function PropertyCardSkeleton() {
  return (
    <Card className="flex flex-col overflow-hidden">
      <Skeleton className="aspect-[4/3] rounded-none" />
      <div className="flex flex-col gap-3 p-5">
        <Skeleton className="h-5 w-4/5" />
        <Skeleton className="h-4 w-3/5" />
        <div className="flex gap-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
        </div>
        <Skeleton className="h-6 w-32" />
      </div>
    </Card>
  );
}
