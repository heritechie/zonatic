import { COMPARISON_CURRENCY, convertCurrency, fxConfig, usdToIdr } from "./fx";
import {
  assertValidPricing,
  validateProviderPricing,
  validateZonaticPricing,
} from "./validate";
import type {
  CalculationInput,
  CalculationResult,
  CostDelta,
  CostLine,
  PricingProduct,
  PricingTier,
  ProviderPricing,
  ZonaticPlan,
  ZonaticPricing,
} from "./types";

import googleData from "./data/google.json";
import zonaticData from "./data/zonatic.json";

/**
 * Location API cost engine.
 *
 * Pure calculation, no React and no presentation. Prices live in
 * `./data/google.json` and `./data/zonatic.json`; the exchange rate lives in
 * `./data/fx.json`. All three are validated at module load, so editing a price
 * or a rate never requires touching this file, and malformed data fails the
 * build instead of reaching a visitor.
 *
 * Honesty rules encoded here:
 *
 *  - **Progressive tiers are applied progressively.** Google prices each
 *    volume band separately and consumes the free monthly cap first, so the
 *    banding is walked explicitly. Charging 100,000 Text Search Pro requests
 *    at a flat first-band rate would bill $3,200 instead of $3,040; charging
 *    1,000,000 Geocoding requests at one rate would bill $5,000 instead of
 *    $3,550.
 *  - **Currencies convert through a declared assumption** from `fx.json`, and
 *    the UI discloses that rate. Nothing converts silently, and no rate literal
 *    appears in this file.
 *  - **No percentage savings from unverified data.** `savingsAreVerified`
 *    requires verified pricing on both sides *and* a verified rate.
 *  - **No invented prices.** A negotiated plan reports `amount: null`.
 *  - **SKU-scoped figures stay SKU-scoped.** A provider line carries the SKU it
 *    was priced from, so the UI can never present one SKU's price as the price
 *    of a whole API family.
 */

/** Validated pricing, loaded once at module initialisation. */
export const googlePricing: ProviderPricing = assertValidPricing(
  validateProviderPricing(googleData),
  "data/google.json",
);

export const zonaticPricing: ZonaticPricing = assertValidPricing(
  validateZonaticPricing(zonaticData),
  "data/zonatic.json",
);

/** Guard against absurd input from a hand-typed field. */
const MAX_REQUESTS = 1_000_000_000_000;

export function sanitizeMonthlyRequests(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.min(Math.floor(value), MAX_REQUESTS);
}

export function billableUnits(
  product: PricingProduct,
  monthlyRequests: number,
): number {
  if (product.unit === "event") return monthlyRequests;
  const perUnit = Math.max(1, product.requestsPerBillableUnit ?? 1);
  return Math.ceil(monthlyRequests / perUnit);
}

function roundCurrency(value: number, currency: CostLine["currency"]): number {
  // Sub-cent precision would imply accuracy these figures do not have.
  return currency === "IDR" ? Math.round(value) : Math.round(value * 100) / 100;
}

/**
 * Cost of one progressive-tier product.
 *
 * Walks the bands in order. `cursor` tracks total monthly volume already
 * priced, so each band only charges the slice of volume that lands inside it,
 * and `freeRemaining` is deducted from the earliest volume first.
 *
 * Reproduces Google's published worked examples exactly:
 *   Geocoding, 2,000,000 requests            -> $5,050.00
 *   Autocomplete Requests, 200,000           -> $481.70
 */
export function progressiveTierCost(
  tiers: PricingTier[],
  freeQuantity: number,
  billableVolume: number,
): number {
  let cursor = 0;
  let freeRemaining = Math.max(0, freeQuantity);
  let cost = 0;

  for (const tier of tiers) {
    const bandEnd = tier.upTo ?? Number.POSITIVE_INFINITY;
    const volumeInBand = Math.max(
      0,
      Math.min(billableVolume, bandEnd) - cursor,
    );

    if (volumeInBand > 0) {
      const freeHere = Math.min(freeRemaining, volumeInBand);
      freeRemaining -= freeHere;
      const billableHere = volumeInBand - freeHere;
      cost += (billableHere / 1000) * tier.pricePer1000;
    }

    if (billableVolume <= bandEnd) break;
    cursor = bandEnd;
  }

  return cost;
}

/** Flat-rate cost, with the free allowance deducted first. */
function flatRateCost(
  product: Extract<PricingProduct, { billingModel: "flat_rate" }>,
  monthlyRequests: number,
): number {
  const billable = Math.max(
    0,
    monthlyRequests - (product.free?.quantity ?? 0),
  );
  return (billable / 1000) * product.pricePer1000;
}

/** Provider cost for any supported billing model. */
function providerCost(
  product: PricingProduct,
  monthlyRequests: number,
): number {
  if (product.billingModel === "flat_rate") {
    return flatRateCost(product, monthlyRequests);
  }
  const units = billableUnits(product, monthlyRequests);
  return progressiveTierCost(
    product.tiers,
    product.free?.quantity ?? 0,
    units,
  );
}

function findGoogleProduct(productId: string): PricingProduct | undefined {
  return googlePricing.products[productId];
}

/** The plan a given monthly volume falls into. */
export function planForVolume(monthlyRequests: number): ZonaticPlan {
  const plans = Object.values(zonaticPricing.plans);
  const covering = plans.find(
    (plan) =>
      plan.includedRequests !== null && plan.includedRequests >= monthlyRequests,
  );
  // Above the highest published tier the plan is negotiated, so no price is
  // reported rather than one being extrapolated.
  return covering ?? plans[plans.length - 1];
}

/** Zonatic cost comes from the plan table, not from a per-unit rate. */
function zonaticCost(productId: string, monthlyRequests: number): CostLine {
  const plan = planForVolume(monthlyRequests);
  const negotiated = plan.monthlyPrice === null;

  return {
    provider: "zonatic",
    productId,
    displayName: zonaticPricing.displayName,
    planLabelKey: plan.labelKey,
    currency: zonaticPricing.currency,
    amount: negotiated ? null : plan.monthlyPrice,
    billableUnits: monthlyRequests,
    unit: "event",
    isEstimate: !zonaticPricing.source.verified,
    source: zonaticPricing.source,
    unavailableReason: negotiated
      ? "Volume ini berada di paket yang disesuaikan. Hubungi kami untuk harga."
      : undefined,
  };
}

/**
 * Express a cost in the comparison currency, using the configured rate table.
 *
 * Returns the cost unchanged when it is already in that currency. An
 * unsupported pair or a missing rate returns `null` rather than a wrong number,
 * so the UI shows "no comparison" instead of a fabricated figure.
 */
function inComparisonCurrency(line: CostLine): number | null {
  if (line.amount === null) return null;
  if (line.currency === COMPARISON_CURRENCY) return line.amount;

  const converted = convertCurrency({
    amount: line.amount,
    from: line.currency,
    to: COMPARISON_CURRENCY,
    rates: fxConfig.rates,
  });
  if (converted === null) return null;
  return roundCurrency(converted, COMPARISON_CURRENCY);
}

function computeDelta(provider: CostLine, zonatic: CostLine): CostDelta | null {
  const providerTotal = inComparisonCurrency(provider);
  const zonaticTotal = inComparisonCurrency(zonatic);
  if (providerTotal === null || zonaticTotal === null) return null;

  return {
    currency: COMPARISON_CURRENCY,
    amount: roundCurrency(providerTotal - zonaticTotal, COMPARISON_CURRENCY),
  };
}

/**
 * Estimate the monthly cost of a location workload on both sides.
 *
 * `provider` is explicit so callers name the provider being compared; the
 * bundled reference data covers the Google Maps Platform.
 */
export function calculateLocationApiCost(
  input: CalculationInput,
): CalculationResult {
  const monthlyRequests = sanitizeMonthlyRequests(input.monthlyRequests);

  const product = findGoogleProduct(input.product);
  const provider: CostLine = product
    ? {
        provider: googlePricing.provider,
        productId: input.product,
        displayName: product.displayName,
        ...(product.sku ? { sku: product.sku } : {}),
        currency: googlePricing.currency,
        amount: roundCurrency(
          providerCost(product, monthlyRequests),
          googlePricing.currency,
        ),
        billableUnits: billableUnits(product, monthlyRequests),
        unit: product.unit,
        isEstimate: !googlePricing.source.verified,
        source: googlePricing.source,
      }
    : {
        provider: input.provider,
        productId: input.product,
        displayName: input.product,
        currency: googlePricing.currency,
        amount: null,
        billableUnits: monthlyRequests,
        unit: "event",
        isEstimate: true,
        unavailableReason: "Belum ada acuan harga untuk produk ini.",
      };

  const zonatic = zonaticCost(input.product, monthlyRequests);
  const delta = computeDelta(provider, zonatic);

  return {
    input: { ...input, monthlyRequests },
    provider,
    zonatic,
    deltas: delta ? [delta] : [],
    hasNumericComparison: delta !== null,
    savingsAreVerified:
      delta !== null &&
      product !== undefined &&
      googlePricing.source.verified &&
      !zonatic.isEstimate &&
      usdToIdr.verified,
  };
}

/** Products the UI may offer, in pricing-file order. */
export function availableProducts(): {
  id: string;
  displayName: string;
  sku?: string;
}[] {
  return Object.entries(googlePricing.products).map(([id, product]) => ({
    id,
    displayName: product.displayName,
    ...(product.sku ? { sku: product.sku } : {}),
  }));
}

/** Volume shortcuts. The field still accepts any custom number. */
export const REQUEST_PRESETS: readonly number[] = [
  10_000, 100_000, 1_000_000, 5_000_000, 10_000_000,
] as const;

/**
 * Re-exported so the UI can disclose provenance and the rate assumption
 * without importing the FX module directly.
 */
export { COMPARISON_CURRENCY, usdToIdr };