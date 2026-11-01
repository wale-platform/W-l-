"use client";

import { useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import {
  Banknote,
  CalendarCheck,
  CreditCard,
  Home,
  Mail,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import {
  AdminPageHeader,
  EmptyState,
  FilterTabs,
  LoadingRows,
  Panel,
  SearchBox,
  formatDateTime,
  useDebouncedValue,
} from "@/components/admin/AdminUI";
import { Button, ErrorState } from "@/components/ui";
import { adminApi } from "@/lib/api/admin";

type Category = "" | "user" | "listing" | "inspection" | "payment" | "payout" | "contact";

const icons: Record<string, LucideIcon> = {
  user: UserRound,
  listing: Home,
  inspection: CalendarCheck,
  payment: CreditCard,
  purchase: CreditCard,
  payout: Banknote,
  contact: Mail,
};

export default function AdminActivityPage() {
  const [category, setCategory] = useState<Category>("");
  const [q, setQ] = useState("");
  const search = useDebouncedValue(q);

  const { data, isPending, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ["admin", "activity", { category, search }],
    queryFn: ({ pageParam }) => adminApi.activity({ category, q: search, before: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  });
  const entries = data?.pages.flatMap((page) => page.entries) ?? [];

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader title="Activity" lead="A log of everything that happens on WALE, newest first." />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <FilterTabs<Category>
          label="Filter activity"
          value={category}
          onChange={setCategory}
          options={[
            { value: "", label: "Everything" },
            { value: "user", label: "Accounts" },
            { value: "listing", label: "Listings" },
            { value: "inspection", label: "Appointments" },
            { value: "payment", label: "Payments" },
            { value: "payout", label: "Payouts" },
            { value: "contact", label: "Messages" },
          ]}
        />
        <SearchBox value={q} onChange={setQ} placeholder="Search activity" />
      </div>

      <Panel>
        {isError ? (
          <ErrorState title="Activity couldn't be loaded" action={<Button onClick={() => void refetch()}>Try again</Button>} />
        ) : isPending ? (
          <LoadingRows rows={6} />
        ) : entries.length === 0 ? (
          <EmptyState>No activity matches these filters.</EmptyState>
        ) : (
          <>
            <ul className="divide-y divide-ink-100">
              {entries.map((entry) => {
                const Icon = icons[entry.action.split(".")[0]] ?? UserRound;
                return (
                  <li key={entry.id} className="flex items-start gap-3 px-5 py-3.5">
                    <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-800">
                      <Icon aria-hidden="true" className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-ink-800">{entry.summary}</p>
                      <p className="mt-0.5 text-xs text-ink-500">
                        {formatDateTime(entry.createdAt)} · <span className="font-mono">{entry.action}</span>
                        {entry.actor && ` · ${entry.actor.role}`}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
            {hasNextPage && (
              <div className="border-t border-ink-100 p-3 text-center">
                <Button tone="outline" size="sm" onClick={() => void fetchNextPage()} isLoading={isFetchingNextPage}>
                  Load older activity
                </Button>
              </div>
            )}
          </>
        )}
      </Panel>
    </div>
  );
}
