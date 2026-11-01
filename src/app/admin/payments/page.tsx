"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import {
  AdminPageHeader,
  EmptyState,
  FilterTabs,
  LoadingRows,
  Panel,
  SearchBox,
  formatDateTime,
  formatKobo,
  useDebouncedValue,
} from "@/components/admin/AdminUI";
import { Badge, Button, ErrorState, toast } from "@/components/ui";
import { adminApi } from "@/lib/api/admin";

type StatusFilter = "" | "success" | "pending" | "failed";
type ProviderFilter = "" | "paystack" | "flutterwave";

const statusBadge = {
  success: { tone: "success", label: "Successful" },
  pending: { tone: "warning", label: "Pending" },
  failed: { tone: "danger", label: "Failed" },
} as const;

function AdminPayments() {
  const params = useSearchParams();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<StatusFilter>((params.get("status") as StatusFilter) ?? "");
  const [provider, setProvider] = useState<ProviderFilter>("");
  const [q, setQ] = useState("");
  const search = useDebouncedValue(q);

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["admin", "payments", { status, provider, search }],
    queryFn: () => adminApi.payments({ status, provider, q: search }),
  });

  const verify = useMutation({
    mutationFn: (reference: string) => adminApi.verifyPayment(reference),
    onSuccess: (result) => {
      toast.success("Checked with the gateway", { description: result.message });
      void queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (error: Error) => toast.error("Couldn't check payment", { description: error.message }),
  });

  const total = (data ?? []).filter((payment) => payment.status === "success").reduce((sum, payment) => sum + payment.amountKobo, 0);

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Payments"
        lead="Every payment through Paystack and Flutterwave — wallet top-ups and boosts paid directly. Re-check a pending payment with its gateway if the payer's redirect or webhook never arrived."
      />

      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap gap-3">
          <FilterTabs<StatusFilter>
            label="Filter by status"
            value={status}
            onChange={setStatus}
            options={[
              { value: "", label: "All" },
              { value: "success", label: "Successful" },
              { value: "pending", label: "Pending" },
              { value: "failed", label: "Failed" },
            ]}
          />
          <FilterTabs<ProviderFilter>
            label="Filter by gateway"
            value={provider}
            onChange={setProvider}
            options={[
              { value: "", label: "Both gateways" },
              { value: "paystack", label: "Paystack" },
              { value: "flutterwave", label: "Flutterwave" },
            ]}
          />
        </div>
        <SearchBox value={q} onChange={setQ} placeholder="Search reference, name or email" />
      </div>

      <Panel
        title={data ? `${data.length} payment${data.length === 1 ? "" : "s"}` : "Payments"}
        actions={data && <p className="text-sm text-ink-600">Successful in view: <span className="font-bold text-ink-900">{formatKobo(total)}</span></p>}
      >
        {isError ? (
          <ErrorState title="Payments couldn't be loaded" action={<Button onClick={() => void refetch()}>Try again</Button>} />
        ) : isPending ? (
          <LoadingRows />
        ) : data.length === 0 ? (
          <EmptyState>No payments match these filters.</EmptyState>
        ) : (
          <ul className="divide-y divide-ink-100">
            {data.map((payment) => (
              <li key={payment.reference} className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-ink-900">
                    {formatKobo(payment.amountKobo)}
                    <span className="font-normal text-ink-500">· {payment.purpose}</span>
                    <Badge tone={statusBadge[payment.status].tone}>{statusBadge[payment.status].label}</Badge>
                  </p>
                  <p className="mt-0.5 truncate text-xs text-ink-600">
                    {payment.user.name} · {payment.user.email}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-ink-400">
                    {payment.provider === "paystack" ? "Paystack" : "Flutterwave"} · {payment.reference}
                    {payment.transactionId && ` · txn ${payment.transactionId}`} · {formatDateTime(payment.paidAt ?? payment.createdAt)}
                  </p>
                </div>
                {payment.status === "pending" && (
                  <Button
                    tone="outline"
                    size="sm"
                    onClick={() => verify.mutate(payment.reference)}
                    isLoading={verify.isPending && verify.variables === payment.reference}
                    loadingText="Checking…"
                  >
                    <RefreshCw aria-hidden="true" className="size-4" /> Re-check with gateway
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

export default function AdminPaymentsPage() {
  return (
    <Suspense fallback={null}>
      <AdminPayments />
    </Suspense>
  );
}
