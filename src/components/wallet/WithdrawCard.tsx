"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, Banknote, Loader2 } from "lucide-react";
import { notificationsKey, walletKey } from "@/components/app/query-keys";
import { Alert, Badge, Button, Card, ConfirmDialog, FormField, Input, Select, toast } from "@/components/ui";
import { PAYOUT_MIN_NAIRA, type Payout } from "@/lib/api/schemas";
import { payoutApi } from "@/lib/api/wallet";
import { cn } from "@/lib/utils/cn";
import { formatNaira } from "@/lib/utils/format";

const payoutsKey = ["payouts"] as const;

/**
 * Withdraw wallet funds to a bank account. The account holder's name is
 * looked up with the bank as soon as the number is complete, and the user
 * confirms that name before the request is sent.
 */
export function WithdrawCard({ balanceKobo }: { balanceKobo: number }) {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [bankFilter, setBankFilter] = useState("");
  const [confirming, setConfirming] = useState(false);

  const banks = useQuery({ queryKey: ["banks"], queryFn: payoutApi.banks, staleTime: 60 * 60 * 1000 });
  const filteredBanks = useMemo(() => {
    const term = bankFilter.trim().toLowerCase();
    const list = banks.data ?? [];
    return term ? list.filter((bank) => bank.name.toLowerCase().includes(term)) : list;
  }, [bankFilter, banks.data]);

  const accountComplete = /^\d{10}$/.test(accountNumber);
  const lookup = useQuery({
    queryKey: ["resolve-account", bankCode, accountNumber],
    queryFn: () => payoutApi.resolve(bankCode, accountNumber),
    enabled: Boolean(bankCode) && accountComplete,
    retry: false,
    staleTime: 10 * 60 * 1000,
  });

  const naira = Number(amount);
  const balance = balanceKobo / 100;
  const amountError =
    amount === ""
      ? null
      : !Number.isInteger(naira) || naira < PAYOUT_MIN_NAIRA
        ? `The minimum withdrawal is ${formatNaira(PAYOUT_MIN_NAIRA)}.`
        : naira > balance
          ? `You have ${formatNaira(balance)} available.`
          : null;
  const ready = amount !== "" && !amountError && lookup.isSuccess;

  const withdraw = useMutation({
    mutationFn: () => payoutApi.request({ amount: naira, bankCode, accountNumber }),
    onSuccess: () => {
      toast.success("Withdrawal requested", { description: "We'll send it to your account and notify you when it's paid." });
      setConfirming(false);
      setAmount("");
      void queryClient.invalidateQueries({ queryKey: walletKey });
      void queryClient.invalidateQueries({ queryKey: payoutsKey });
      void queryClient.invalidateQueries({ queryKey: notificationsKey });
    },
    onError: () => setConfirming(false),
  });

  const bankName = lookup.data?.bankName ?? banks.data?.find((bank) => bank.code === bankCode)?.name ?? "";

  return (
    <Card className="p-5 sm:p-6">
      <h2 className="flex items-center gap-2 text-lg font-bold text-ink-900">
        <Banknote aria-hidden="true" className="size-5 text-brand-800" /> Withdraw to bank
      </h2>
      <p className="mt-1 text-sm text-ink-600">
        {formatNaira(balance)} available. Withdrawals are reviewed and paid by the WALE team, usually within one working day.
      </p>

      <div className="mt-5 flex flex-col gap-4">
        {withdraw.isError && (
          <Alert tone="danger" title="Withdrawal not requested">
            {withdraw.error.message}
          </Alert>
        )}
        {banks.isError && (
          <Alert tone="info" title="Withdrawals are being set up">
            {banks.error.message}
          </Alert>
        )}

        <FormField label="Amount (₦)" required error={amountError ?? undefined}>
          {(field) => (
            <Input
              {...field}
              type="number"
              inputMode="numeric"
              min={PAYOUT_MIN_NAIRA}
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder={`At least ${PAYOUT_MIN_NAIRA.toLocaleString("en-NG")}`}
            />
          )}
        </FormField>

        <FormField label="Bank" required hint="Type to narrow the list.">
          {(field) => (
            <div className="flex flex-col gap-2">
              <Input
                type="search"
                value={bankFilter}
                onChange={(event) => setBankFilter(event.target.value)}
                placeholder="Search banks"
                aria-label="Search banks"
                disabled={!banks.data}
              />
              <Select
                {...field}
                value={bankCode}
                onChange={(event) => setBankCode(event.target.value)}
                disabled={!banks.data}
              >
                <option value="">{banks.isPending ? "Loading banks…" : "Choose your bank"}</option>
                {filteredBanks.map((bank) => (
                  <option key={bank.code} value={bank.code}>
                    {bank.name}
                  </option>
                ))}
              </Select>
            </div>
          )}
        </FormField>

        <FormField label="Account number" required>
          {(field) => (
            <Input
              {...field}
              inputMode="numeric"
              maxLength={10}
              value={accountNumber}
              onChange={(event) => setAccountNumber(event.target.value.replace(/\D/g, "").slice(0, 10))}
              placeholder="10-digit NUBAN"
            />
          )}
        </FormField>

        {/* Live account-name check */}
        {bankCode && accountComplete && (
          <div
            role="status"
            className={cn(
              "flex items-center gap-2 rounded-2xl px-4 py-3 text-sm",
              lookup.isSuccess ? "bg-success-subtle text-ink-900" : lookup.isError ? "bg-danger-subtle text-danger" : "bg-ink-50 text-ink-600",
            )}
          >
            {lookup.isPending ? (
              <>
                <Loader2 aria-hidden="true" className="size-4 animate-spin" /> Checking account…
              </>
            ) : lookup.isSuccess ? (
              <>
                <BadgeCheck aria-hidden="true" className="size-4 text-success" />
                <span>
                  Account name: <span className="font-bold">{lookup.data.accountName}</span>
                </span>
              </>
            ) : (
              lookup.error?.message
            )}
          </div>
        )}

        <Button size="lg" block disabled={!ready} onClick={() => setConfirming(true)}>
          {ready ? `Withdraw ${formatNaira(naira)}` : "Withdraw"}
        </Button>
      </div>

      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={() => withdraw.mutate()}
        title={`Send ${formatNaira(naira || 0)} to ${lookup.data?.accountName ?? "this account"}?`}
        description={`${bankName} · ${accountNumber}. Make sure this is your account — the amount is held from your wallet now and paid out by the WALE team.`}
        confirmLabel="Confirm withdrawal"
        isLoading={withdraw.isPending}
      />
    </Card>
  );
}

const payoutStatus = {
  pending: { tone: "warning", label: "Processing" },
  paid: { tone: "success", label: "Paid" },
  rejected: { tone: "danger", label: "Declined · refunded" },
} as const;

export function PayoutHistory() {
  const { data } = useQuery({ queryKey: payoutsKey, queryFn: payoutApi.list });
  if (!data || data.length === 0) return null;

  return (
    <Card className="overflow-hidden">
      <h2 className="border-b border-ink-100 px-5 py-4 text-base font-bold text-ink-900">Withdrawals</h2>
      <ul className="divide-y divide-ink-100">
        {data.map((payout: Payout) => (
          <li key={payout.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink-900">
                {formatNaira(payout.amountKobo / 100)}{" "}
                <span className="font-normal text-ink-500">
                  to {payout.accountName} · {payout.bankName} ••{payout.accountNumber.slice(-4)}
                </span>
              </p>
              <p className="text-xs text-ink-500">
                {new Date(payout.createdAt).toLocaleString("en-NG", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
                {payout.transferReference && ` · Ref ${payout.transferReference}`}
                {payout.status === "rejected" && payout.adminNote && ` · ${payout.adminNote}`}
              </p>
            </div>
            <Badge tone={payoutStatus[payout.status].tone}>{payoutStatus[payout.status].label}</Badge>
          </li>
        ))}
      </ul>
    </Card>
  );
}
