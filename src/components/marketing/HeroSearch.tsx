"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Search } from "lucide-react";
import { Button, Select } from "@/components/ui";
import { universities } from "@/config/site";

/**
 * Hero search entry point. Deliberately shallow — it collects a query
 * and a university, then hands off to the full search page (pass 3)
 * where the remaining filters live.
 */
export function HeroSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [university, setUniversity] = useState("");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const params = new URLSearchParams();
    if (query.trim()) params.set("query", query.trim());
    if (university) params.set("university", university);

    router.push(`/properties${params.toString() ? `?${params}` : ""}`);
  }

  return (
    <form
      onSubmit={handleSubmit}
      role="search"
      aria-label="Search student housing"
      className="flex w-full flex-col gap-2 rounded-card border border-ink-200 bg-white p-2 shadow-lifted sm:flex-row"
    >
      <div className="relative flex-1">
        <label htmlFor="hero-query" className="sr-only">
          Search by area, city, or landmark
        </label>
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-400"
        />
        <input
          id="hero-query"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search Tanke, Oke-Odo, Malete…"
          className="h-12 w-full rounded-field border-0 pl-10 pr-3 text-sm text-ink-900 placeholder:text-ink-400 focus-visible:outline-none"
        />
      </div>

      <div className="sm:w-52">
        <label htmlFor="hero-university" className="sr-only">
          Filter by university
        </label>
        <Select
          id="hero-university"
          value={university}
          onChange={(event) => setUniversity(event.target.value)}
          className="h-12 border-0 sm:border-l sm:border-ink-100 sm:rounded-none"
        >
          <option value="">Any university</option>
          {universities.map((uni) => (
            <option key={uni.id} value={uni.id}>
              {uni.short}
            </option>
          ))}
        </Select>
      </div>

      <Button type="submit" size="lg" className="h-12 sm:px-8">
        Search
      </Button>
    </form>
  );
}
