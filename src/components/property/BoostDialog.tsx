"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CreditCard, Rocket, Wallet as WalletIcon } from "lucide-react";
import { notificationsKey, walletKey } from "@/components/app/query-keys";
import { Alert, Button, Modal, toast } from "@/components/ui";
import { BOOST_PLANS, PAY_METHODS, type BoostPlanId, type PayMethod } from "@/lib/api/schemas";
import { boostApi, walletApi } from "@/lib/api/wallet";
import { cn } from "@/lib/utils/cn";
import { formatNaira } from "@/lib/utils/format";

/**
 * Pick a boost plan and pay for it from the wallet balance or directly
 * with Paystack / Flutterwave.
 */
export function BoostDialog({
  listing,
  onClose,
  onBoosted,
}: {
  listing: { id: string; title: string } | null;
  onClose: () => void;
  onBoosted?: () => void;
}) {
  const queryClient = useQueryClient();
  const [plan, setPlan] = useState<BoostPlanId>("7d");
  const [method, setMethod] = useState<PayMethod>("wallet");
  const [redirecting, setRedirecting] = useState(false);

  const wallet = useQuery({ queryKey: walletKey, queryFn: walletApi.get, enabled: Boolean(listing) });
  const price = BOOST_PLANS.find((option) => option.id === plan)!.price;
  const balance = (wallet.data?.balanceKobo ?? 0) / 100;
  const walletShort = wallet.data ? balance < price : false;

  const available = (value: PayMethod) =>
    value === "wallet" ? !walletShort : Boolean(wallet.data?.providers[value]);

  const boost = useMutation({
    mutationFn: () => boostApi.boost({ propertyId: listing!.id, plan, method }),
    onSuccess: (result) => {
      if (result.status === "redirect") {
        setRedirecting(true);
        window.location.assign(result.authorizationUrl);
        return;
      }
      void queryClient.invalidateQueries({ queryKey: walletKey });
      void queryClient.invalidateQueries({ queryKey: notificationsKey });
      toast.success("Listing boosted", {
        description: `Boosted until ${new Date(result.boostedUntil).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}.`,
      });
      onBoosted?.();
      onClose();
    },
  });

  return (
    <Modal
      open={Boolean(listing)}
      onClose={() => {
        boost.reset();
        onClose();
      }}
      title="Boost this listing"
      description={listing ? `"${listing.title}" will appear first in search and be marked as featured.` : undefined}
      footer={
        <>
          <Button tone="outline" onClick={onClose} disabled={boost.isPending || redirecting}>
            Cancel
          </Button>
          <Button
            onClick={() => boost.mutate()}
            disabled={!available(method)}
            isLoading={boost.isPending || redirecting}
            loadingText={redirecting ? "Opening checkout…" : "Processing…"}
          >
            <Rocket aria-hidden="true" className="size-4" /> Pay {formatNaira(price)}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        {boost.isError && (
          <Alert tone="danger" title="Boost not applied">
            {boost.error.message}
          </Alert>
        )}

        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-ink-800">Duration</legend>
          <div className="grid grid-cols-3 gap-2">
            {BOOST_PLANS.map((option) => (
              <button
                key={option.id}
                type="button"
                aria-pressed={plan === option.id}
                onClick={() => setPlan(option.id)}
                className={cn(
                  "rounded-2xl border p-3 text-left transition-colors",
                  plan === option.id ? "border-brand-700 bg-brand-50" : "border-ink-200 hover:border-brand-300",
                )}
              >
                <span className="block text-sm font-bold text-ink-900">{option.label}</span>
                <span className="mt-0.5 block text-sm text-brand-800">{formatNaira(option.price)}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-ink-800">Pay with</legend>
          <div className="flex flex-col gap-2">
            {PAY_METHODS.map((option) => {
              const enabled = available(option.value);
              return (
                <label
                  key={option.value}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 transition-colors",
                    method === option.value ? "border-brand-700 bg-brand-50" : "border-ink-200 hover:border-brand-300",
                    !enabled && "cursor-not-allowed opacity-50",
                  )}
                >
                  <input
                    type="radio"
                    name="boost-method"
                    value={option.value}
                    checked={method === option.value}
                    disabled={!enabled}
                    onChange={() => setMethod(option.value)}
                    className="accent-brand-700"
                  />
                  {option.value === "wallet" ? (
                    <WalletIcon aria-hidden="true" className="size-4 text-brand-800" />
                  ) : (
                    <CreditCard aria-hidden="true" className="size-4 text-brand-800" />
                  )}
                  <span className="flex-1 text-sm font-semibold text-ink-900">{option.label}</span>
                  <span className="text-xs text-ink-500">
                    {option.value === "wallet"
                      ? wallet.data
                        ? `${formatNaira(balance)} available${walletShort ? " — not enough" : ""}`
                        : "…"
                      : enabled
                        ? "Card, transfer, USSD"
                        : "Not available yet"}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
      </div>
    </Modal>
  );
}

/** Message after returning from a gateway boost payment (`?boost=success|pending|failed`). */
export function BoostReturnNotice() {
  const status = useSearchParams().get("boost");
  const queryClient = useQueryClient();
  const refreshed = useRef(false);

  useEffect(() => {
    if (!status || refreshed.current) return;
    refreshed.current = true;
    void queryClient.invalidateQueries({ queryKey: ["myProperties"] });
    void queryClient.invalidateQueries({ queryKey: notificationsKey });
  }, [queryClient, status]);

  if (status === "success") {
    return (
      <Alert tone="success" title="Boost active">
        Payment confirmed — your listing now appears first in search.
      </Alert>
    );
  }
  if (status === "pending") {
    return (
      <Alert tone="info" title="Payment processing">
        We&apos;re waiting for the payment provider to confirm. The boost starts automatically once it does.
      </Alert>
    );
  }
  if (status === "failed") {
    return (
      <Alert tone="danger" title="Boost payment not completed">
        The payment was cancelled or declined, so the boost wasn&apos;t applied. You can try again.
      </Alert>
    );
  }
  return null;
}
