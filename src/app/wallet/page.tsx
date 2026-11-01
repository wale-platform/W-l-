"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CreditCard, Wallet as WalletIcon } from "lucide-react";
import { notificationsKey, walletKey } from "@/components/app/query-keys";
import {
  Alert,
  Badge,
  Button,
  Card,
  ErrorState,
  FormField,
  Input,
  Skeleton,
} from "@/components/ui";
import {
  PAYMENT_PROVIDERS,
  WALLET_TOP_UP_LIMITS,
  walletTopUpSchema,
  type Wallet,
  type WalletTopUp,
  type WalletTopUpValues,
} from "@/lib/api/schemas";
import { walletApi } from "@/lib/api/wallet";
import { PayoutHistory, WithdrawCard } from "@/components/wallet/WithdrawCard";
import { cn } from "@/lib/utils/cn";
import { formatNaira } from "@/lib/utils/format";

const QUICK_AMOUNTS = [1_000, 5_000, 10_000, 50_000];

const dateFormat = new Intl.DateTimeFormat("en-NG", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export default function WalletPage() {
  const { data, isPending, isError, refetch } = useQuery({ queryKey: walletKey, queryFn: walletApi.get });

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-800">Wallet</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">Your WALE wallet</h1>
        <p className="mt-1 text-sm text-ink-600">
          Fund your wallet with Paystack or Flutterwave, pay for boosts from your balance, and withdraw to your bank.
        </p>
      </div>

      <Suspense fallback={null}>
        <PaymentResult />
      </Suspense>

      {isError ? (
        <ErrorState title="Your wallet couldn't be loaded" action={<Button onClick={() => void refetch()}>Try again</Button>} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <BalanceCard wallet={data} isPending={isPending} />
          <TopUpCard wallet={data} />
        </div>
      )}

      {data && (
        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <WithdrawCard balanceKobo={data.balanceKobo} />
          <div className="flex flex-col gap-6">
            <History payments={data.payments} />
            <PayoutHistory />
          </div>
        </div>
      )}
    </div>
  );
}

/** Message after returning from the gateway (`/wallet?payment=success|pending|failed`). */
function PaymentResult() {
  const status = useSearchParams().get("payment");
  const queryClient = useQueryClient();
  const refreshed = useRef(false);

  useEffect(() => {
    if (!status || refreshed.current) return;
    refreshed.current = true;
    void queryClient.invalidateQueries({ queryKey: walletKey });
    void queryClient.invalidateQueries({ queryKey: notificationsKey });
  }, [queryClient, status]);

  if (status === "success") {
    return (
      <Alert tone="success" title="Payment successful">
        Your wallet has been credited. A receipt is in your notifications.
      </Alert>
    );
  }
  if (status === "pending") {
    return (
      <Alert tone="info" title="Payment processing">
        We&apos;re waiting for confirmation from the payment provider. Your balance will update
        automatically once it&apos;s confirmed — you don&apos;t need to pay again.
      </Alert>
    );
  }
  if (status === "failed") {
    return (
      <Alert tone="danger" title="Payment not completed">
        The payment was cancelled or declined, and you were not charged by WALE. You can try again below.
      </Alert>
    );
  }
  return null;
}

function BalanceCard({ wallet, isPending }: { wallet?: Wallet; isPending: boolean }) {
  return (
    <div className="relative isolate overflow-hidden rounded-3xl bg-brand-950 p-6 text-white sm:p-8">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(70%_70%_at_0%_0%,rgba(122,23,55,0.7),transparent_70%)]"
      />
      <span className="flex size-12 items-center justify-center rounded-2xl bg-white/10 text-brand-100">
        <WalletIcon aria-hidden="true" className="size-6" />
      </span>
      <p className="mt-6 text-sm text-white/70">Available balance</p>
      {isPending || !wallet ? (
        <Skeleton className="mt-2 h-10 w-40 bg-white/20" />
      ) : (
        <p className="mt-1 text-4xl font-extrabold tracking-tight tabular-nums">
          {formatNaira(wallet.balanceKobo / 100)}
        </p>
      )}
      <p className="mt-6 text-xs leading-5 text-white/60">
        Payments are processed on the provider&apos;s secure page. WALE never sees or stores your card details.
      </p>
    </div>
  );
}

function TopUpCard({ wallet }: { wallet?: Wallet }) {
  const providers = wallet?.providers;
  const firstAvailable = PAYMENT_PROVIDERS.find((option) => providers?.[option.value])?.value ?? "paystack";
  const [redirecting, setRedirecting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<WalletTopUpValues, unknown, WalletTopUp>({
    resolver: zodResolver(walletTopUpSchema),
    defaultValues: { amount: 5_000, provider: firstAvailable },
    // Re-select a usable provider once availability loads.
    values: providers ? { amount: 5_000, provider: firstAvailable } : undefined,
    resetOptions: { keepDirtyValues: true },
  });
  const provider = useWatch({ control, name: "provider" });
  const amount = useWatch({ control, name: "amount" });

  const mutation = useMutation({
    mutationFn: walletApi.startTopUp,
    onSuccess: (checkoutUrl) => {
      setRedirecting(true);
      // Off-site hosted checkout page.
      window.location.assign(checkoutUrl);
    },
  });

  const noneAvailable = providers && !providers.paystack && !providers.flutterwave;

  return (
    <Card className="p-5 sm:p-6">
      <h2 className="flex items-center gap-2 text-lg font-bold text-ink-900">
        <CreditCard aria-hidden="true" className="size-5 text-brand-800" /> Fund wallet
      </h2>

      {noneAvailable ? (
        <Alert tone="info" title="Payments are being set up" className="mt-4">
          Wallet funding will be available shortly. Please check back soon.
        </Alert>
      ) : (
        <form onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate className="mt-4 flex flex-col gap-5">
          {mutation.isError && (
            <Alert tone="danger" title="Payment couldn't start">
              {mutation.error.message}
            </Alert>
          )}

          <FormField
            label="Amount (₦)"
            required
            hint={`Between ${formatNaira(WALLET_TOP_UP_LIMITS.min)} and ${formatNaira(WALLET_TOP_UP_LIMITS.max)}.`}
            error={errors.amount?.message}
          >
            {(field) => (
              <Input {...field} {...register("amount")} type="number" inputMode="numeric" min={WALLET_TOP_UP_LIMITS.min} step={1} />
            )}
          </FormField>

          <div className="flex flex-wrap gap-2" aria-label="Quick amounts">
            {QUICK_AMOUNTS.map((quick) => (
              <button
                key={quick}
                type="button"
                onClick={() => setValue("amount", quick, { shouldValidate: true, shouldDirty: true })}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors",
                  Number(amount) === quick
                    ? "border-brand-700 bg-brand-50 text-brand-800"
                    : "border-ink-200 text-ink-700 hover:border-brand-300",
                )}
              >
                {formatNaira(quick)}
              </button>
            ))}
          </div>

          <fieldset>
            <legend className="mb-2 text-sm font-medium text-ink-800">Pay with</legend>
            <div className="grid grid-cols-2 gap-3">
              {PAYMENT_PROVIDERS.map((option) => {
                const available = providers?.[option.value] ?? false;
                return (
                  <label
                    key={option.value}
                    className={cn(
                      "flex cursor-pointer flex-col gap-0.5 rounded-xl border p-3 transition-colors",
                      provider === option.value ? "border-brand-700 bg-brand-50" : "border-ink-200 hover:border-brand-300",
                      !available && "cursor-not-allowed opacity-50",
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <input type="radio" value={option.value} disabled={!available} {...register("provider")} className="accent-brand-700" />
                      <span className="text-sm font-semibold text-ink-900">{option.label}</span>
                    </span>
                    <span className="pl-5 text-xs text-ink-500">{available ? "Card, bank transfer, USSD" : "Not available yet"}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <Button
            type="submit"
            size="lg"
            block
            disabled={!providers}
            isLoading={mutation.isPending || redirecting}
            loadingText={redirecting ? "Opening secure checkout…" : "Starting payment…"}
          >
            Continue to payment
          </Button>
        </form>
      )}
    </Card>
  );
}

function History({ payments }: { payments: Wallet["payments"] }) {
  return (
    <Card className="overflow-hidden">
      <h2 className="border-b border-ink-100 px-5 py-4 text-base font-bold text-ink-900">Recent top-ups</h2>
      {payments.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-ink-500">No payments yet.</p>
      ) : (
        <ul className="divide-y divide-ink-100">
          {payments.map((payment) => (
            <li key={payment.reference} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink-900">
                  {formatNaira(payment.amountKobo / 100)}{" "}
                  <span className="font-normal text-ink-500">
                    via {payment.provider === "paystack" ? "Paystack" : "Flutterwave"}
                  </span>
                </p>
                <p className="text-xs text-ink-500">
                  {dateFormat.format(new Date(payment.paidAt ?? payment.createdAt))} · {payment.reference}
                </p>
              </div>
              <Badge tone={payment.status === "success" ? "success" : payment.status === "failed" ? "danger" : "warning"}>
                {payment.status === "success" ? "Successful" : payment.status === "failed" ? "Failed" : "Pending"}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
