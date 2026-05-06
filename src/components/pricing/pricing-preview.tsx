"use client";

import { useEffect, useState } from "react";
import { Euro, ShieldCheck, WalletCards } from "lucide-react";

import {
  calculatePricingBreakdownFromEuros,
  formatMoneyFromCents,
} from "@/config/pricing";

type PricingPreviewProps = {
  inputId: string;
};

export function PricingPreview({ inputId }: PricingPreviewProps) {
  const [rawPrice, setRawPrice] = useState("");

  useEffect(() => {
    const inputElement = document.getElementById(inputId);

    if (!(inputElement instanceof HTMLInputElement)) {
      return;
    }

    const input = inputElement;

    function handleInput() {
      setRawPrice(input.value);
    }

    handleInput();

    input.addEventListener("input", handleInput);
    input.addEventListener("change", handleInput);

    return () => {
      input.removeEventListener("input", handleInput);
      input.removeEventListener("change", handleInput);
    };
  }, [inputId]);

  const price = Number(rawPrice.replace(",", "."));

  if (!Number.isFinite(price) || price <= 0) {
    return (
      <div className="rounded-[22px] border border-dashed border-[var(--border-strong)] bg-white/55 p-4">
        <p className="text-sm font-black">Price preview</p>
        <p className="mt-1 text-sm font-semibold leading-6 text-muted">
          Enter a price to see what the client pays and what you receive.
        </p>
      </div>
    );
  }

  const pricing = calculatePricingBreakdownFromEuros(price);

  return (
    <div className="rounded-[24px] border border-[var(--border)] bg-[var(--card-soft)] p-4">
      <div className="flex items-center gap-2">
        <WalletCards size={16} className="text-[var(--primary-dark)]" />
        <p className="text-sm font-black">Price preview</p>
      </div>

      <div className="mt-4 grid gap-2">
        <MoneyRow
          icon={Euro}
          label="Your service price"
          value={formatMoneyFromCents(pricing.servicePriceCents)}
        />

        <MoneyRow
          icon={ShieldCheck}
          label="SkillDrop commission"
          value={`-${formatMoneyFromCents(pricing.providerCommissionCents)}`}
        />

        <MoneyRow
          icon={WalletCards}
          label="You receive estimate"
          value={formatMoneyFromCents(pricing.providerNetCents)}
          strong
        />

        <MoneyRow
          icon={Euro}
          label="Client pays total"
          value={formatMoneyFromCents(pricing.clientTotalCents)}
          strong
        />
      </div>

      <p className="mt-3 text-xs font-semibold leading-5 text-muted">
        Client total includes a small SkillDrop service fee. Your estimate is
        before any Stripe payout or bank fees.
      </p>
    </div>
  );
}

function MoneyRow({
  icon: Icon,
  label,
  value,
  strong = false,
}: {
  icon: typeof Euro;
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-white/64 p-3">
      <p className="inline-flex items-center gap-2 text-sm font-bold text-muted">
        <Icon size={14} />
        {label}
      </p>

      <p
        className={
          strong
            ? "text-right text-sm font-black text-[var(--primary-dark)]"
            : "text-right text-sm font-black"
        }
      >
        {value}
      </p>
    </div>
  );
}