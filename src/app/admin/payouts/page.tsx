"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, X } from "lucide-react";
import {
  AdminPageHeader,
  EmptyState,
  FilterTabs,
  LoadingRows,
  Panel,
  formatDateTime,
  formatKobo,
} from "@/components/admin/AdminUI";
import { Alert, Badge, Button, ErrorState, FormField, Input, Modal, Textarea, toast } from "@/components/ui";
import { adminApi } from "@/lib/api/admin";
import type { Payout } from "@/lib/api/schemas";

type StatusFilter = "" | "pending" | "paid" | "rejected";

const statusBadge = {
  pending: { tone: "warning", label: "To pay" },
  paid: { tone: "success", label: "Paid" },
  rejected: { tone: "danger", label: "Rejected · refunded" },
} as const;

function AdminPayouts() {
  const params = useSearchParams();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<StatusFilter>((params.get("status") as StatusFilter) ?? "pending");
  const [action, setAction] = useState<{ payout: Payout; kind: "paid" | "reject" } | null>(null);
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["admin", "payouts", status],
    queryFn: () => adminApi.payouts(status || undefined),
  });

  const close = () => {
    setAction(null);
    setReference("");
    setNote("");
    process.reset();
  };

  const process = useMutation({
    mutationFn: () =>
      action!.kind === "paid"
        ? adminApi.markPayoutPaid(action!.payout.id, reference, note || undefined)
        : adminApi.rejectPayout(action!.payout.id, note),
    onSuccess: () => {
      toast.success(action?.kind === "paid" ? "Marked as paid" : "Withdrawal rejected and refunded", {
        description: "The user has been notified.",
      });
      void queryClient.invalidateQueries({ queryKey: ["admin"] });
      close();
    },
  });

  const copy = (text: string) => {
    void navigator.clipboard?.writeText(text).then(() => toast.success("Copied"));
  };

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Payouts"
        lead="Withdrawal requests. Send the bank transfer, then mark it paid with the transfer reference — or reject it to refund the user's wallet."
      />

      <FilterTabs<StatusFilter>
        label="Filter payouts"
        value={status}
        onChange={setStatus}
        options={[
          { value: "pending", label: "To pay" },
          { value: "paid", label: "Paid" },
          { value: "rejected", label: "Rejected" },
          { value: "", label: "All" },
        ]}
      />

      <Panel>
        {isError ? (
          <ErrorState title="Payouts couldn't be loaded" action={<Button onClick={() => void refetch()}>Try again</Button>} />
        ) : isPending ? (
          <LoadingRows />
        ) : data.length === 0 ? (
          <EmptyState>{status === "pending" ? "No withdrawals waiting. 🎉" : "No payouts here yet."}</EmptyState>
        ) : (
          <ul className="divide-y divide-ink-100">
            {data.map((payout) => (
              <li key={payout.id} className="flex flex-col gap-3 px-5 py-4 lg:flex-row lg:items-center">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-base font-extrabold text-ink-900">
                    {formatKobo(payout.amountKobo)}
                    <Badge tone={statusBadge[payout.status].tone}>{statusBadge[payout.status].label}</Badge>
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-ink-800">
                    <span className="font-semibold">{payout.accountName}</span>
                    <span className="text-ink-500">· {payout.bankName} ·</span>
                    <button
                      type="button"
                      onClick={() => copy(payout.accountNumber)}
                      className="inline-flex items-center gap-1 font-mono font-semibold text-brand-800 hover:underline"
                      aria-label={`Copy account number ${payout.accountNumber}`}
                    >
                      {payout.accountNumber} <Copy aria-hidden="true" className="size-3.5" />
                    </button>
                  </p>
                  <p className="mt-0.5 text-xs text-ink-500">
                    Requested by {payout.user?.name} ({payout.user?.email}) · {formatDateTime(payout.createdAt)}
                  </p>
                  {payout.transferReference && (
                    <p className="mt-0.5 text-xs text-ink-500">Transfer ref {payout.transferReference}</p>
                  )}
                  {payout.adminNote && <p className="mt-0.5 text-xs text-ink-500">Note: {payout.adminNote}</p>}
                </div>
                {payout.status === "pending" && (
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => setAction({ payout, kind: "paid" })}>
                      <Check aria-hidden="true" className="size-4" /> Mark as paid
                    </Button>
                    <Button tone="outline" size="sm" onClick={() => setAction({ payout, kind: "reject" })}>
                      <X aria-hidden="true" className="size-4" /> Reject
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Modal
        open={Boolean(action)}
        onClose={close}
        title={action?.kind === "paid" ? "Mark withdrawal as paid" : "Reject withdrawal"}
        description={
          action
            ? `${formatKobo(action.payout.amountKobo)} to ${action.payout.accountName}, ${action.payout.bankName} ${action.payout.accountNumber}.`
            : undefined
        }
        footer={
          <>
            <Button tone="outline" onClick={close} disabled={process.isPending}>
              Cancel
            </Button>
            <Button
              tone={action?.kind === "reject" ? "danger" : "primary"}
              onClick={() => process.mutate()}
              isLoading={process.isPending}
              disabled={action?.kind === "paid" ? !reference.trim() : !note.trim()}
            >
              {action?.kind === "paid" ? "Confirm paid" : "Reject and refund"}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {process.isError && (
            <Alert tone="danger" title="Not processed">
              {process.error.message}
            </Alert>
          )}
          {action?.kind === "paid" ? (
            <>
              <p className="text-sm text-ink-600">
                Only confirm after the bank transfer has actually been sent. The user is notified with this reference.
              </p>
              <FormField label="Transfer reference" required>
                {(field) => (
                  <Input {...field} value={reference} onChange={(event) => setReference(event.target.value)} placeholder="e.g. bank session ID" />
                )}
              </FormField>
              <FormField label="Note (optional)">
                {(field) => <Input {...field} value={note} onChange={(event) => setNote(event.target.value)} />}
              </FormField>
            </>
          ) : (
            <>
              <p className="text-sm text-ink-600">
                The amount goes straight back to the user&apos;s wallet. Tell them why so they can fix it.
              </p>
              <FormField label="Reason" required>
                {(field) => (
                  <Textarea
                    {...field}
                    rows={3}
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="e.g. Account name doesn't match your WALE account"
                  />
                )}
              </FormField>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}

export default function AdminPayoutsPage() {
  return (
    <Suspense fallback={null}>
      <AdminPayouts />
    </Suspense>
  );
}
