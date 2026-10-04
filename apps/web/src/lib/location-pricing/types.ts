/**
 * Types for the location API cost estimator.
 *
 * These types describe the *shape of the JSON pricing files* in `./data`, so
 * the data layer stays the single source of truth for prices while the
 * calculator stays the single source of truth for arithmetic.
 */

export type ProviderId = "google_maps" | "zonatic";

export type CurrencyCode = "USD" | "IDR";

/**
 * What a product is billed against.
 *
 * `event` is a single billable API call. `session` exists because some
 * autocomplete SKUs bill per session rather than per keystroke; a product
 * using it must also declare `requestsPerBillableUnit`, since collapsing many
 * requests into one billable unit is a modelling assumption, not a fact.
 */
export type PricingUnit = "event" | "session";

/** Billing models the calculator knows how to evaluate. */
export type BillingModel = "progressive_tier" | "flat_rate";

/**
 * Provenance for a price.
 *
 * `verified: true` means a human checked the figure against the linked source
 * on `checkedAt`. `false` means the figure is a hypothesis or placeholder and
 * must be labelled as an estimate wherever it is shown.
 */
export type PricingSource = {
  url?: string;
  /** Product documentation, kept beside the price so the UI can disclose both. */
  documentationUrl?: string;
  verified: boolean;
  /** ISO date (YYYY-MM-DD) the figure was last checked or authored. */
  checkedAt: string;
  note?: string;
};

/**
 * Optional validity window.
 *
 * The schema can represent historical pricing so a future change can be
 * recorded without rewriting past entries. The calculator ignores these
 * today — no historical pricing UI exists yet.
 */
export type EffectiveWindow = {
  effectiveFrom?: string | null;
  effectiveUntil?: string | null;
};

/** Free monthly allowance, consumed before any billable volume. */
export type FreeAllowance = {
  quantity: number;
};

/**
 * One volume band.
 *
 * `upTo` is the inclusive upper bound of *total monthly volume* for the band;
 * `null` means "and above". Bands are billed progressively — each band prices
 * only the volume that falls inside it — which is how Google describes its
 * automatic volume discounts.
 */
export type PricingTier = EffectiveWindow & {
  upTo: number | null;
  pricePer1000: number;
};

/** Volume-banded pricing. */
export type ProgressiveTierProduct = EffectiveWindow & {
  /**
   * Shown verbatim in the UI. Product names are proper nouns, so they come from
   * the data file rather than from a content map — adding a product then needs
   * no code or copy change, and the SKU can never be shown unqualified.
   */
  displayName: string;
  /**
   * Google's SKU code. Google prices each SKU separately and varies the price by
   * requested fields, so the SKU is what makes a quoted figure unambiguous.
   */
  sku?: string;
  billingModel: "progressive_tier";
  unit: PricingUnit;
  requestsPerBillableUnit?: number;
  free?: FreeAllowance;
  tiers: PricingTier[];
  notes?: string;
  verification?: PricingVerification;
};

/** Single rate for all billable volume. */
export type FlatRateProduct = EffectiveWindow & {
  displayName: string;
  sku?: string;
  billingModel: "flat_rate";
  unit: PricingUnit;
  requestsPerBillableUnit?: number;
  free?: FreeAllowance;
  pricePer1000: number;
  notes?: string;
  verification?: PricingVerification;
};

export type PricingProduct = ProgressiveTierProduct | FlatRateProduct;

/**
 * A published worked example, kept alongside the data it validates.
 *
 * Storing the source's own arithmetic next to the rates makes the pricing
 * auditable: if a rate is ever edited wrongly, these stop reproducing.
 */
export type PricingVerification = {
  /**
   * How these examples were obtained.
   *
   * `official_worked_example` means the source page prints the arithmetic.
   * `derived_from_table` means the figures are computed from the source's rate
   * table using the source's own stated billing rules. Distinguishing them
   * keeps the file honest about how far each number is first-hand.
   */
  basis: "official_worked_example" | "derived_from_table";
  examples: {
    monthlyRequests: number;
    expectedAmount: number;
    why: string;
  }[];
};

/** A third-party provider's pricing, as loaded from its JSON file. */
export type ProviderPricing = {
  provider: ProviderId;
  displayName: string;
  currency: CurrencyCode;
  source: PricingSource;
  products: Record<string, PricingProduct>;
};

/**
 * A Zonatic plan: a monthly price covering an included request volume.
 *
 * `negotiated: true` means the price is agreed individually, so there is no
 * figure to display and none is invented.
 */
export type ZonaticPlan = EffectiveWindow & {
  labelKey: string;
  monthlyPrice: number | null;
  includedRequests: number | null;
  negotiated?: boolean;
  note?: string;
};

/** Zonatic's own pricing, as loaded from its JSON file. */
export type ZonaticPricing = {
  provider: "zonatic";
  displayName: string;
  currency: CurrencyCode;
  source: PricingSource;
  plans: Record<string, ZonaticPlan>;
};

/* ------------------------------------------------------------------ */
/* FX configuration                                                     */
/* ------------------------------------------------------------------ */

/**
 * One exchange rate, as authored in `data/fx.json`.
 *
 * `source` records where the number came from. `verified: false` marks an
 * assumption: the calculator uses it, discloses it, and refuses to express the
 * comparison as a percentage saving.
 */
export type FxRate = {
  value: number;
  /** e.g. `manual`, or a named rate feed if one is adopted later. */
  source: string;
  verified: boolean;
  /** ISO date (YYYY-MM-DD). */
  checkedAt: string;
  note?: string;
};

/** The whole rate table, keyed by the currency being converted *to*. */
export type FxConfig = {
  baseCurrency: CurrencyCode;
  rates: Record<string, FxRate>;
};

/** Arguments for {@link convertCurrency}. */
export type ConversionRequest = {
  amount: number;
  from: CurrencyCode;
  to: CurrencyCode;
  rates: FxConfig["rates"];
};

/* ------------------------------------------------------------------ */
/* Normalised calculation output                                       */
/* ------------------------------------------------------------------ */

/** One side of the comparison, fully resolved. */
export type CostLine = {
  provider: ProviderId;
  productId: string;
  /** For a provider line, the product's display name. */
  displayName: string;
  /** For a provider line, the SKU the figure applies to. */
  sku?: string;
  /** For a Zonatic line, which plan the volume landed on. */
  planLabelKey?: string;
  currency: CurrencyCode;
  /** Monthly cost, or `null` when it cannot be stated (negotiated plan). */
  amount: number | null;
  /** Billable units this request volume converts to. */
  billableUnits: number;
  unit: PricingUnit;
  /** Pricing is an estimate, not verified list pricing. */
  isEstimate: boolean;
  /** Provenance for the figure, so the UI can disclose where it came from. */
  source?: PricingSource;
  /** Why `amount` is `null`, when it is. */
  unavailableReason?: string;
};

export type CostDelta = {
  currency: CurrencyCode;
  /** Provider estimate minus Zonatic cost. Positive means Zonatic is cheaper. */
  amount: number;
};

export type CalculationInput = {
  provider: ProviderId;
  product: string;
  monthlyRequests: number;
};

export type CalculationResult = {
  input: CalculationInput;
  provider: CostLine;
  zonatic: CostLine;
  deltas: CostDelta[];
  hasNumericComparison: boolean;
  /**
   * Only true when pricing on both sides *and* the exchange rate are
   * verified. Percentage savings stay hidden otherwise.
   */
  savingsAreVerified: boolean;
};