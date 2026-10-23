"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Badge, Button, Card, CardBody, CardHeader, CardTitle, toast } from "@/components/ui";
import { Container, Section, SectionHeading } from "@/components/layout/Container";
import { Download, LockKeyhole, Mail, Search, Users, X } from "lucide-react";

const STATUSES = ["new", "contacted", "invited", "converted", "unsubscribed"] as const;
type WaitlistStatus = (typeof STATUSES)[number];

interface WaitlistSignup {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: "student" | "tenant" | "landlord" | "lawyer";
  status: WaitlistStatus;
  consent_at: string;
  created_at: string;
}

function statusTone(status: WaitlistStatus) {
  if (status === "new") return "info";
  if (status === "contacted") return "warning";
  if (status === "invited" || status === "converted") return "success";
  return "neutral";
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

async function readResponse<T>(response: Response): Promise<T> {
  const result: unknown = await response.json();
  if (!response.ok) {
    const message =
      typeof result === "object" && result !== null && "message" in result && typeof result.message === "string"
        ? result.message
        : "The request could not be completed.";
    throw new Error(message);
  }
  return result as T;
}

function csvCell(value: string | null) {
  const safe = (value ?? "").replace(/^[\s]*[=+\-@]/, "'$&");
  return `"${safe.replace(/"/g, '""')}"`;
}

function exportCsv(signups: WaitlistSignup[]) {
  const columns: (keyof WaitlistSignup)[] = [
    "name",
    "email",
    "phone",
    "role",
    "status",
    "created_at",
    "consent_at",
  ];
  const rows = [
    columns.join(","),
    ...signups.map((signup) =>
      columns.map((column) => csvCell(String(signup[column] ?? ""))).join(","),
    ),
  ];
  const blob = new Blob(["\uFEFF", rows.join("\r\n")], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `wale-waitlist-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function AdminWaitlistPage() {
  const queryClient = useQueryClient();
  const [keyInput, setKeyInput] = useState("");
  const [adminKey, setAdminKey] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<WaitlistStatus | "all">("all");

  const {
    data: signups = [],
    isLoading,
    isFetching,
    isError,
    error,
  } = useQuery({
    queryKey: ["adminWaitlist", adminKey],
    queryFn: async () => {
      const response = await fetch("/api/admin/waitlist", {
        headers: { Authorization: `Bearer ${adminKey}` },
        cache: "no-store",
      });
      return readResponse<WaitlistSignup[]>(response);
    },
    enabled: adminKey.length > 0,
    retry: false,
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: WaitlistStatus }) => {
      const response = await fetch("/api/admin/waitlist", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${adminKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id, status }),
      });
      return readResponse<WaitlistSignup>(response);
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<WaitlistSignup[]>(["adminWaitlist", adminKey], (current) =>
        current?.map((signup) => (signup.id === updated.id ? updated : signup)),
      );
      toast.success("Waitlist status updated");
    },
    onError: (mutationError) => {
      toast.error("Could not update signup", {
        description:
          mutationError instanceof Error ? mutationError.message : "Please try again.",
      });
    },
  });

  const filteredSignups = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase();
    return signups.filter((signup) => {
      const matchesStatus = statusFilter === "all" || signup.status === statusFilter;
      const matchesSearch =
        !normalizedSearch ||
        [signup.name, signup.email, signup.phone ?? "", signup.role]
          .some((value) => value.toLocaleLowerCase().includes(normalizedSearch));
      return matchesStatus && matchesSearch;
    });
  }, [search, signups, statusFilter]);

  function connect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!keyInput.trim()) return;
    setAdminKey(keyInput.trim());
  }

  function disconnect() {
    setAdminKey("");
    setKeyInput("");
    queryClient.removeQueries({ queryKey: ["adminWaitlist"] });
  }

  return (
    <main>
      <Section>
        <Container size="wide" className="flex flex-col gap-8">
          <SectionHeading
            eyebrow="Admin"
            title="Waitlist Management"
            lead="Review early-access signups, track follow-up, and export records for approved outreach."
          />

          {!adminKey ? (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <LockKeyhole className="size-5 text-brand-700" />
                  <CardTitle>Connect securely</CardTitle>
                </div>
                <p className="mt-2 text-sm leading-6 text-ink-600">
                  Enter the server-configured ADMIN_API_KEY. It is used only for this page session and is not saved in browser storage.
                </p>
              </CardHeader>
              <CardBody>
                <form onSubmit={connect} className="flex flex-col gap-3 sm:flex-row">
                  <label className="sr-only" htmlFor="waitlist-admin-key">Admin API key</label>
                  <input
                    id="waitlist-admin-key"
                    type="password"
                    autoComplete="off"
                    value={keyInput}
                    onChange={(event) => setKeyInput(event.target.value)}
                    placeholder="Enter ADMIN_API_KEY"
                    className="min-h-11 flex-1 rounded-field border border-ink-200 px-3 py-2 text-sm"
                  />
                  <Button type="submit" disabled={!keyInput.trim()}>
                    <LockKeyhole className="size-4" /> Connect
                  </Button>
                </form>
              </CardBody>
            </Card>
          ) : (
            <>
              {isError && (
                <Alert tone="danger" title="Could not access waitlist records">
                  {error instanceof Error ? error.message : "Check the key and server configuration, then reconnect."}
                  <div className="mt-3">
                    <Button type="button" size="sm" tone="outline" onClick={disconnect}>
                      <X className="size-4" /> Disconnect
                    </Button>
                  </div>
                </Alert>
              )}

              {!isError && (
                <>
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {STATUSES.map((status) => (
                      <Card key={status}>
                        <CardBody className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-2xl font-bold text-ink-900">
                              {signups.filter((signup) => signup.status === status).length}
                            </p>
                            <p className="text-xs font-medium uppercase tracking-wider text-ink-500">
                              {status}
                            </p>
                          </div>
                          <Badge tone={statusTone(status)}>{status}</Badge>
                        </CardBody>
                      </Card>
                    ))}
                  </div>

                  <Card>
                    <CardHeader className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Users className="size-5 text-brand-700" />
                        <CardTitle>Signups ({signups.length})</CardTitle>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          tone="outline"
                          onClick={() => exportCsv(filteredSignups)}
                          disabled={!filteredSignups.length || isFetching}
                        >
                          <Download className="size-4" />
                          Export CSV ({filteredSignups.length})
                        </Button>
                        <Button type="button" size="sm" tone="outline" onClick={disconnect}>
                          Disconnect
                        </Button>
                      </div>
                    </CardHeader>
                    <CardBody className="flex flex-col gap-4">
                      <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
                        <label className="relative">
                          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
                          <span className="sr-only">Search signups</span>
                          <input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search name, email, phone or role"
                            className="min-h-11 w-full rounded-field border border-ink-200 pl-9 pr-3 text-sm"
                          />
                        </label>
                        <label className="flex items-center gap-2 text-sm font-medium text-ink-700">
                          <span className="sr-only">Filter by status</span>
                          <select
                            value={statusFilter}
                            onChange={(event) => setStatusFilter(event.target.value as WaitlistStatus | "all")}
                            className="min-h-11 w-full rounded-field border border-ink-200 bg-white px-3 py-2"
                          >
                            <option value="all">All statuses</option>
                            {STATUSES.map((status) => (
                              <option key={status} value={status}>{status}</option>
                            ))}
                          </select>
                        </label>
                      </div>

                      {isLoading ? (
                        <div className="h-40 animate-pulse rounded-card bg-ink-100" />
                      ) : filteredSignups.length === 0 ? (
                        <div className="flex flex-col items-center gap-3 py-12 text-center">
                          <Mail className="size-10 text-ink-300" />
                          <h3 className="font-semibold text-ink-900">
                            {signups.length ? "No signups match these filters" : "No waitlist signups yet"}
                          </h3>
                          <p className="text-sm text-ink-500">
                            {signups.length ? "Try a different search or status." : "New early-access signups will appear here."}
                          </p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                            <thead>
                              <tr className="border-b border-ink-150 text-xs uppercase tracking-wide text-ink-500">
                                <th scope="col" className="px-3 py-3">Signup</th>
                                <th scope="col" className="px-3 py-3">Role</th>
                                <th scope="col" className="px-3 py-3">Joined</th>
                                <th scope="col" className="px-3 py-3">Status</th>
                                <th scope="col" className="px-3 py-3">Manage status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-ink-100">
                              {filteredSignups.map((signup) => (
                                <tr key={signup.id} className="align-top">
                                  <td className="px-3 py-4">
                                    <p className="font-semibold text-ink-950">{signup.name}</p>
                                    <a href={`mailto:${signup.email}`} className="mt-1 block text-brand-700 hover:underline">
                                      {signup.email}
                                    </a>
                                    {signup.phone && (
                                      <a href={`tel:${signup.phone}`} className="mt-1 block text-xs text-ink-500 hover:underline">
                                        {signup.phone}
                                      </a>
                                    )}
                                  </td>
                                  <td className="px-3 py-4 capitalize text-ink-700">{signup.role}</td>
                                  <td className="px-3 py-4 whitespace-nowrap text-ink-600">{formatDate(signup.created_at)}</td>
                                  <td className="px-3 py-4">
                                    <Badge tone={statusTone(signup.status)}>{signup.status}</Badge>
                                  </td>
                                  <td className="px-3 py-4">
                                    <label className="sr-only" htmlFor={`status-${signup.id}`}>
                                      Update status for {signup.name}
                                    </label>
                                    <select
                                      id={`status-${signup.id}`}
                                      value={signup.status}
                                      onChange={(event) =>
                                        statusMutation.mutate({
                                          id: signup.id,
                                          status: event.target.value as WaitlistStatus,
                                        })
                                      }
                                      disabled={statusMutation.isPending}
                                      className="rounded-field border border-ink-200 bg-white px-2 py-2 text-sm"
                                    >
                                      {STATUSES.map((status) => (
                                        <option key={status} value={status}>{status}</option>
                                      ))}
                                    </select>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </CardBody>
                  </Card>
                </>
              )}
            </>
          )}
        </Container>
      </Section>
    </main>
  );
}
