"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Banknote,
  CalendarCheck,
  CreditCard,
  Home,
  ShieldCheck,
  Users,
  Wallet,
} from "lucide-react";
import {
  AdminPageHeader,
  EmptyState,
  LoadingRows,
  Panel,
  StatCard,
  formatDateTime,
  formatKobo,
} from "@/components/admin/AdminUI";
import { Button, ErrorState } from "@/components/ui";
import { adminApi } from "@/lib/api/admin";

export default function AdminDashboard() {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["admin", "overview"],
    queryFn: adminApi.overview,
    refetchInterval: 60_000,
  });

  if (isError) {
    return (
      <ErrorState
        title="The dashboard couldn't be loaded"
        action={<Button onClick={() => void refetch()}>Try again</Button>}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Overview"
        lead="Everything happening on WALE: people, listings, appointments and money."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Users}
          label="Users"
          value={data ? data.users.total : "…"}
          hint={data && `${data.users.newThisWeek} new this week · ${data.users.suspended} suspended`}
          href="/admin/users"
        />
        <StatCard
          icon={ShieldCheck}
          tone="warning"
          label="Listings to verify"
          value={data ? data.listings.pending : "…"}
          hint={data && `${data.listings.verified} verified of ${data.listings.total}`}
          href="/admin/listings?status=pending"
        />
        <StatCard
          icon={CalendarCheck}
          tone="info"
          label="Pending appointments"
          value={data ? data.inspections.pending : "…"}
          hint={data && `${data.inspections.approved} approved · ${data.inspections.completed} completed`}
          href="/admin/inspections"
        />
        <StatCard
          icon={Banknote}
          tone="danger"
          label="Payouts to process"
          value={data ? data.payouts.pending : "…"}
          hint={data && `${formatKobo(data.payouts.pendingKobo)} waiting`}
          href="/admin/payouts"
        />
        <StatCard
          icon={CreditCard}
          tone="success"
          label="Collected (30 days)"
          value={data ? formatKobo(data.payments.collected30dKobo) : "…"}
          hint={data && `${formatKobo(data.payments.collectedKobo)} all time · ${data.payments.successful} payments`}
          href="/admin/payments"
        />
        <StatCard
          icon={Wallet}
          label="Held in user wallets"
          value={data ? formatKobo(data.wallets.totalBalanceKobo) : "…"}
          hint="Owed to users if they withdraw"
        />
        <StatCard
          icon={CreditCard}
          tone="warning"
          label="Pending payments"
          value={data ? data.payments.pending : "…"}
          hint={data && `${data.payments.failed} failed`}
          href="/admin/payments?status=pending"
        />
        <StatCard
          icon={Banknote}
          tone="success"
          label="Paid out"
          value={data ? formatKobo(data.payouts.paidKobo) : "…"}
          hint="Total withdrawals sent"
          href="/admin/payouts?status=paid"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Panel
          title="Recent activity"
          actions={
            <Link href="/admin/activity" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-800 hover:underline">
              View all <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          }
        >
          {isPending ? (
            <LoadingRows rows={5} />
          ) : data.recentActivity.length === 0 ? (
            <EmptyState>Nothing has happened yet.</EmptyState>
          ) : (
            <ul className="divide-y divide-ink-100">
              {data.recentActivity.map((entry) => (
                <li key={entry.id} className="px-5 py-3">
                  <p className="text-sm text-ink-800">{entry.summary}</p>
                  <p className="mt-0.5 text-xs text-ink-500">{formatDateTime(entry.createdAt)}</p>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="People by role">
          {isPending ? (
            <LoadingRows rows={5} />
          ) : (
            <ul className="divide-y divide-ink-100">
              {(
                [
                  ["student", "Students"],
                  ["landlord", "Landlords"],
                  ["lawyer", "Property lawyers"],
                  ["tenant", "Outgoing tenants"],
                  ["admin", "Admins"],
                ] as const
              ).map(([role, label]) => (
                <li key={role}>
                  <Link
                    href={`/admin/users?role=${role}`}
                    className="flex items-center justify-between px-5 py-3 text-sm transition-colors hover:bg-ink-50"
                  >
                    <span className="flex items-center gap-2 text-ink-700">
                      <Home aria-hidden="true" className="size-4 text-ink-400" />
                      {label}
                    </span>
                    <span className="font-bold tabular-nums text-ink-900">{data.users.byRole[role]}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
