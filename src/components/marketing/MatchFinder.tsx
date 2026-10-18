"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { PropertyCard } from "@/components/property/PropertyCard";
import { propertyListResponseSchema, type Property } from "@/lib/api/schemas";
import {
  getMatchScore,
  matchesRequirements,
  type MatchPreferences,
} from "@/lib/matching";

type RankedProperty = {
  property: Property;
  score: number;
};

function isPropertyType(value: string): value is MatchPreferences["propertyType"] {
  return (
    value === "any" ||
    value === "studio" ||
    value === "shared" ||
    value === "one_bedroom" ||
    value === "two_bedroom"
  );
}

const initialPreferences: MatchPreferences = {
  location: "",
  propertyType: "any",
  minBedrooms: 0,
  verifiedOnly: false,
};

export function MatchFinder() {
  const [preferences, setPreferences] =
    useState<MatchPreferences>(initialPreferences);
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadProperties() {
      try {
        const response = await fetch("/api/properties?page=1&pageSize=50", {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error("We couldn't load homes right now. Please try again.");
        }

        const data = propertyListResponseSchema.parse(await response.json());
        setProperties(data.properties);
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setError(
          cause instanceof Error
            ? cause.message
            : "We couldn't load homes right now. Please try again.",
        );
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }

    void loadProperties();
    return () => controller.abort();
  }, []);

  const rankedProperties = useMemo<RankedProperty[]>(
    () =>
      properties
        .filter((property) => matchesRequirements(property, preferences))
        .map((property) => ({
          property,
          score: getMatchScore(property, preferences),
        }))
        .sort(
          (a, b) =>
            b.score - a.score || a.property.price - b.property.price,
        ),
    [preferences, properties],
  );

  function updatePreferences(patch: Partial<MatchPreferences>) {
    setPreferences((current) => ({ ...current, ...patch }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
  }

  return (
    <div className="mx-auto max-w-7xl px-5 py-6 sm:px-8 sm:py-8">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink-900 sm:text-4xl">
          The right home starts with what matters to you.
        </h1>
        <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-ink-600">
          Set your budget and must-haves to rank homes that fit.
        </p>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-start">
        <form
          onSubmit={handleSubmit}
          className="sticky top-16 z-20 max-h-[calc(100svh-4.5rem)] self-start space-y-4 overflow-y-auto rounded-2xl border border-ink-200 bg-white p-4 shadow-sm sm:p-5 lg:top-20 lg:max-h-[calc(100svh-6rem)]"
        >
          <div>
            <label
              htmlFor="match-location"
              className="mb-1.5 block text-sm font-semibold text-ink-800"
            >
              Preferred area
            </label>
            <input
              id="match-location"
              type="search"
              value={preferences.location}
              onChange={(event) =>
                updatePreferences({ location: event.target.value })
              }
              placeholder="City, neighbourhood, or university"
              className="h-10 w-full rounded-field border border-ink-200 px-3 text-sm text-ink-900 placeholder:text-ink-400"
            />
          </div>

          <div>
            <label
              htmlFor="match-budget"
              className="mb-1.5 block text-sm font-semibold text-ink-800"
            >
              Maximum rent per year (₦)
            </label>
            <input
              id="match-budget"
              type="number"
              min="0"
              step="50000"
              inputMode="numeric"
              value={preferences.maxBudget ?? ""}
              onChange={(event) =>
                updatePreferences({
                  maxBudget: event.target.value
                    ? Number(event.target.value)
                    : undefined,
                })
              }
              placeholder="Any budget"
              className="h-10 w-full rounded-field border border-ink-200 px-3 text-sm text-ink-900 placeholder:text-ink-400"
            />
          </div>

          <div>
            <label
              htmlFor="match-type"
              className="mb-1.5 block text-sm font-semibold text-ink-800"
            >
              Home type
            </label>
            <select
              id="match-type"
              value={preferences.propertyType}
              onChange={(event) =>
                isPropertyType(event.target.value) &&
                updatePreferences({ propertyType: event.target.value })
              }
              className="h-10 w-full rounded-field border border-ink-200 bg-white px-3 text-sm text-ink-900"
            >
              <option value="any">Any home type</option>
              <option value="studio">Studio / self-contained</option>
              <option value="shared">Shared accommodation</option>
              <option value="one_bedroom">One bedroom</option>
              <option value="two_bedroom">Two bedrooms</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="match-bedrooms"
              className="mb-1.5 block text-sm font-semibold text-ink-800"
            >
              Minimum bedrooms
            </label>
            <select
              id="match-bedrooms"
              value={preferences.minBedrooms}
              onChange={(event) =>
                updatePreferences({ minBedrooms: Number(event.target.value) })
              }
              className="h-10 w-full rounded-field border border-ink-200 bg-white px-3 text-sm text-ink-900"
            >
              <option value={0}>Any number</option>
              <option value={1}>1 bedroom or more</option>
              <option value={2}>2 bedrooms or more</option>
              <option value={3}>3 bedrooms or more</option>
            </select>
          </div>

          <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-field border border-ink-200 px-4 text-sm font-medium text-ink-800">
            <input
              type="checkbox"
              checked={preferences.verifiedOnly}
              onChange={(event) =>
                updatePreferences({ verifiedOnly: event.target.checked })
              }
              className="size-4 accent-brand-800"
            />
            Show verified listings only
          </label>

          <p className="text-xs leading-5 text-ink-500">
            Ranked from listing details. Your preferences aren&apos;t saved.
          </p>
        </form>

        <section aria-labelledby="match-results-title">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2
                id="match-results-title"
                className="text-xl font-bold text-ink-900"
              >
                Best matches
              </h2>
            </div>
            {!isLoading && !error && (
              <span className="text-sm text-ink-500">
                {rankedProperties.length}{" "}
                {rankedProperties.length === 1 ? "home" : "homes"}
              </span>
            )}
          </div>

          {isLoading ? (
            <p role="status" className="rounded-2xl bg-ink-50 p-6 text-ink-600">
              Finding homes that fit…
            </p>
          ) : error ? (
            <p role="alert" className="rounded-2xl bg-danger-subtle p-6 text-danger">
              {error}
            </p>
          ) : rankedProperties.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-ink-300 p-6 text-center sm:p-10">
              <h3 className="text-lg font-semibold text-ink-900">
                No homes match every requirement yet
              </h3>
              <p className="mt-2 text-sm leading-6 text-ink-600">
                Try increasing your budget or relaxing one of the filters to
                see more options.
              </p>
              <Link
                href="/properties"
                className="mt-4 inline-flex text-sm font-semibold text-brand-800 hover:underline"
              >
                Browse every home
              </Link>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2">
              {rankedProperties.map(({ property, score }) => (
                <article key={property.id}>
                  <p className="mb-2 inline-flex rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-800">
                    {score}% preference match
                  </p>
                  <PropertyCard property={property} />
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
