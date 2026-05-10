export const PRICING_CONFIG = {
  providerCommissionRate: 0.1,
  clientServiceFeeRate: 0.05,
  currency: "EUR",
  minServicePriceCents: 500,
  maxServicePriceCents: 50000,
} as const;

export type PricingBreakdown = {
  servicePriceCents: number;
  providerCommissionCents: number;
  providerNetCents: number;
  clientServiceFeeCents: number;
  clientTotalCents: number;
  platformFeeCents: number;
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

export function validateServicePrice(priceCents: number) {
  const normalizedPrice = Math.round(priceCents);

  if (!Number.isFinite(normalizedPrice)) {
    return {
      success: false,
      message: "Invalid price.",
    };
  }

  if (normalizedPrice < PRICING_CONFIG.minServicePriceCents) {
    return {
      success: false,
      message: "The minimum price is €5.",
    };
  }

  if (normalizedPrice > PRICING_CONFIG.maxServicePriceCents) {
    return {
      success: false,
      message: "The maximum price is €500.",
    };
  }

  return {
    success: true,
    message: null,
  };
}

export function calculatePricingBreakdownFromEuros(priceEuros: number) {
  const priceCents = Math.round(priceEuros * 100);

  return calculatePricingBreakdown(priceCents);
}

export function formatMoneyFromCents(cents: number, currency = "EUR") {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}