"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, CheckCircle2, Trash2 } from "lucide-react";
import {
  AdminPageHeader,
  EmptyState,
  FilterTabs,
  LoadingRows,
  Panel,
  SearchBox,
  formatDay,
  formatKobo,
  useDebouncedValue,
} from "@/components/admin/AdminUI";
import { Avatar, Badge, Button, ConfirmDialog, ErrorState, toast } from "@/components/ui";
import { adminApi, type AdminUser } from "@/lib/api/admin";
import type { AuthRole } from "@/lib/api/schemas";

const ROLE_OPTIONS: { value: AuthRole; label: string }[] = [
  { value: "student", label: "Student" },
  { value: "landlord", label: "Landlord" },
  { value: "lawyer", label: "Property lawyer" },
  { value: "tenant", label: "Outgoing tenant" },
  { value: "admin", label: "Admin" },
];

type RoleFilter = "" | AuthRole;
type StatusFilter = "" | "active" | "suspended";

function AdminUsers() {
  const params = useSearchParams();
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [role, setRole] = useState<RoleFilter>((params.get("role") as RoleFilter) ?? "");
  const [status, setStatus] = useState<StatusFilter>("");
  const search = useDebouncedValue(q);
  const [pending, setPending] = useState<{ user: AdminUser; action: "suspend" | "delete" } | null>(null);

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["admin", "users", { search, role, status }],
    queryFn: () => adminApi.users({ q: search, role, status }),
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin"] });
  };

  const update = useMutation({
    mutationFn: ({ id, change }: { id: string; change: { role?: AuthRole; suspended?: boolean } }) =>
      adminApi.updateUser(id, change),
    onSuccess: () => {
      toast.success("User updated");
      setPending(null);
      refresh();
    },
    onError: (error: Error) => toast.error("Couldn't update user", { description: error.message }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => adminApi.deleteUser(id),
    onSuccess: () => {
      toast.success("Account deleted");
      setPending(null);
      refresh();
    },
    onError: (error: Error) => toast.error("Couldn't delete account", { description: error.message }),
  });

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Users"
        lead="Search accounts, change account types, suspend access, or remove accounts."
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <FilterTabs<RoleFilter>
          label="Filter by role"
          value={role}
          onChange={setRole}
          options={[{ value: "", label: "All" }, ...ROLE_OPTIONS.map((option) => ({ ...option, label: `${option.label}s` }))]}
        />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <FilterTabs<StatusFilter>
            label="Filter by status"
            value={status}
            onChange={setStatus}
            options={[
              { value: "", label: "Any status" },
              { value: "active", label: "Active" },
              { value: "suspended", label: "Suspended" },
            ]}
          />
          <SearchBox value={q} onChange={setQ} placeholder="Search name, email or phone" />
        </div>
      </div>

      <Panel>
        {isError ? (
          <ErrorState title="Users couldn't be loaded" action={<Button onClick={() => void refetch()}>Try again</Button>} />
        ) : isPending ? (
          <LoadingRows />
        ) : data.length === 0 ? (
          <EmptyState>No accounts match these filters.</EmptyState>
        ) : (
          <ul className="divide-y divide-ink-100">
            {data.map((user) => (
              <li key={user.id} className="flex flex-col gap-4 px-5 py-4 xl:flex-row xl:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <Avatar name={user.fullName} />
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink-900">
                      {user.fullName}
                      {user.isYou && <Badge tone="brand">You</Badge>}
                      {user.suspended && <Badge tone="danger">Suspended</Badge>}
                      {!user.emailVerified && <Badge tone="warning">Email not confirmed</Badge>}
                    </p>
                    <p className="truncate text-xs text-ink-500">
                      {user.email}
                      {user.phone && ` · ${user.phone}`}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-400">
                      Joined {formatDay(user.createdAt)} · {user.signIn}
                      {user.lastLoginAt && ` · last login ${formatDay(user.lastLoginAt)}`}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-ink-500">
                  <span>
                    Wallet <span className="font-semibold text-ink-900">{formatKobo(user.walletBalanceKobo)}</span>
                  </span>
                  <span>
                    Listings <span className="font-semibold text-ink-900">{user.listings}</span>
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <label className="sr-only" htmlFor={`role-${user.id}`}>
                    Account type for {user.fullName}
                  </label>
                  <select
                    id={`role-${user.id}`}
                    value={user.role}
                    disabled={user.isYou || update.isPending}
                    onChange={(event) =>
                      update.mutate({ id: user.id, change: { role: event.target.value as AuthRole } })
                    }
                    className="h-9 rounded-full border border-ink-200 bg-white px-3 text-sm font-medium text-ink-800 disabled:opacity-60"
                  >
                    {ROLE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {user.suspended ? (
                    <Button
                      tone="outline"
                      size="sm"
                      disabled={user.isYou}
                      onClick={() => update.mutate({ id: user.id, change: { suspended: false } })}
                    >
                      <CheckCircle2 aria-hidden="true" className="size-4" /> Reactivate
                    </Button>
                  ) : (
                    <Button tone="outline" size="sm" disabled={user.isYou} onClick={() => setPending({ user, action: "suspend" })}>
                      <Ban aria-hidden="true" className="size-4" /> Suspend
                    </Button>
                  )}
                  <Button
                    tone="ghost"
                    size="sm"
                    disabled={user.isYou}
                    onClick={() => setPending({ user, action: "delete" })}
                    aria-label={`Delete ${user.fullName}`}
                    className="text-danger hover:bg-danger-subtle"
                  >
                    <Trash2 aria-hidden="true" className="size-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <ConfirmDialog
        open={pending?.action === "suspend"}
        onClose={() => setPending(null)}
        onConfirm={() => pending && update.mutate({ id: pending.user.id, change: { suspended: true } })}
        title={`Suspend ${pending?.user.fullName ?? "this user"}?`}
        description="They'll be signed out everywhere immediately and can't sign in until you reactivate the account. Their listings and wallet are kept."
        confirmLabel="Suspend account"
        tone="danger"
        isLoading={update.isPending}
      />
      <ConfirmDialog
        open={pending?.action === "delete"}
        onClose={() => setPending(null)}
        onConfirm={() => pending && remove.mutate(pending.user.id)}
        title={`Delete ${pending?.user.fullName ?? "this account"} permanently?`}
        description="This removes the account and its listings, inspections, notifications and payment history. It can't be undone. Accounts with wallet funds or pending withdrawals can't be deleted — suspend them instead."
        confirmLabel="Delete permanently"
        tone="danger"
        isLoading={remove.isPending}
      />
    </div>
  );
}

export default function AdminUsersPage() {
  return (
    <Suspense fallback={null}>
      <AdminUsers />
    </Suspense>
  );
}
