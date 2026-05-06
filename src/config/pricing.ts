export const PRICING_CONFIG = {
  providerCommissionRate: 0.1,
  clientServiceFeeRate: 0.05,
  currency: "EUR",
};

export type PricingBreakdown = {
  servicePriceCents: number;

  providerCommissionCents: number;
  providerNetCents: number;

  clientServiceFeeCents: number;
  clientTotalCents: number;

  /**
   * Backward-compatible alias.
   * Same value as providerCommissionCents.
   */
  platformFeeCents: number;

  /**
   * Total SkillDrop fee collected in Stripe Checkout:
   * provider commission + client service fee.
   */
  platformGrossFeeCents: number;

  currency: string;
};

export function calculatePricingBreakdown(
  servicePriceCents: number,
): PricingBreakdown {
  const safeServicePriceCents = Math.max(Math.round(servicePriceCents), 0);

  const providerCommissionCents = Math.round(
    safeServicePriceCents * PRICING_CONFIG.providerCommissionRate,
  );

  const providerNetCents = safeServicePriceCents - providerCommissionCents;

  const clientServiceFeeCents = Math.round(
    safeServicePriceCents * PRICING_CONFIG.clientServiceFeeRate,
  );

  const clientTotalCents = safeServicePriceCents + clientServiceFeeCents;

  const platformGrossFeeCents =
    providerCommissionCents + clientServiceFeeCents;

  return {
    servicePriceCents: safeServicePriceCents,

    providerCommissionCents,
    providerNetCents,

    clientServiceFeeCents,
    clientTotalCents,

    platformFeeCents: providerCommissionCents,
    platformGrossFeeCents,

    currency: PRICING_CONFIG.currency,
  };
}

export function calculatePricingBreakdownFromEuros(priceEuros: number) {
  const priceCents = Math.round(priceEuros * 100);

  return calculatePricingBreakdown(priceCents);
}

export function formatMoneyFromCents(cents: number) {
  return `€${(cents / 100).toFixed(2).replace(".00", "")}`;
}