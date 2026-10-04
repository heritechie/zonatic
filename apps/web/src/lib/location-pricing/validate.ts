import type {
  CurrencyCode,
  FxConfig,
  PricingProduct,
  PricingTier,
  ProviderPricing,
  ZonaticPlan,
  ZonaticPricing,
} from "./types";

/**
 * Runtime validation for the pricing JSON files.
 *
 * Hand-written rather than pulled from a schema library: the rules are a
 * short, specific list, and the project has no validation dependency to
 * reuse. Adding one for ~150 lines of checks would be the larger cost.
 *
 * The calculator runs this at module load, so a malformed price fails the
 * build (or the first render) instead of silently producing a wrong number in
 * front of a visitor.
 */

export type ValidationResult<T> =
  | { ok: true; value: T; issues: [] }
  | { ok: false; value: null; issues: string[] };

const VALID_CURRENCIES: readonly string[] = ["USD", "IDR"];
const VALID_PROVIDERS: readonly string[] = ["google_maps", "zonatic"];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function validateSource(source: unknown, path: string, issues: string[]) {
  if (!isRecord(source)) {
    issues.push(`${path}: missing source object`);
    return;
  }
  if (typeof source.verified !== "boolean") {
    issues.push(`${path}.verified: must be a boolean`);
  }
  if (typeof source.checkedAt !== "string" || !ISO_DATE.test(source.checkedAt)) {
    issues.push(`${path}.checkedAt: must be an ISO date (YYYY-MM-DD)`);
  }
  // A verified price without a source URL cannot be audited.
  if (source.verified === true && typeof source.url !== "string") {
    issues.push(`${path}.url: required when verified is true`);
  }
  validateEffectiveWindow(source, path, issues);
}

/**
 * The window a price applies to. Present so a future pricing file can state
 * when it took effect, but never rendered as a historical price lookup.
 */
function validateEffectiveWindow(
  source: Record<string, unknown>,
  path: string,
  issues: string[],
) {
  for (const key of ["effectiveFrom", "effectiveUntil"] as const) {
    const value = source[key];
    if (value !== undefined && value !== null) {
      if (typeof value !== "string" || !ISO_DATE.test(value)) {
        issues.push(`${path}.${key}: must be an ISO date (YYYY-MM-DD)`);
      }
    }
  }
  const from = source.effectiveFrom;
  const until = source.effectiveUntil;
  if (
    typeof from === "string" &&
    ISO_DATE.test(from) &&
    typeof until === "string" &&
    ISO_DATE.test(until) &&
    until < from
  ) {
    issues.push(`${path}: effectiveUntil must not precede effectiveFrom`);
  }
}

function validateTiers(tiers: unknown, path: string, issues: string[]) {
  if (!Array.isArray(tiers) || tiers.length === 0) {
    issues.push(`${path}: tiers must be a non-empty array`);
    return;
  }

  let previousBoundary = 0;
  tiers.forEach((raw: unknown, index) => {
    const tierPath = `${path}[${index}]`;
    if (!isRecord(raw)) {
      issues.push(`${tierPath}: must be an object`);
      return;
    }
    const tier = raw as unknown as PricingTier;

    if (!isFiniteNumber(tier.pricePer1000) || tier.pricePer1000 < 0) {
      issues.push(`${tierPath}.pricePer1000: must be a number >= 0`);
    }

    if (tier.upTo === null) {
      if (index !== tiers.length - 1) {
        issues.push(
          `${tierPath}.upTo: only the final tier may have a null upper bound`,
        );
      }
      return;
    }

    if (!isFiniteNumber(tier.upTo) || tier.upTo <= 0) {
      issues.push(`${tierPath}.upTo: must be a positive number or null`);
      return;
    }
    // Bands are progressive and must be strictly increasing and non-overlapping.
    if (tier.upTo <= previousBoundary) {
      issues.push(
        `${tierPath}.upTo: must be greater than the previous boundary (${previousBoundary}); tiers must ascend and not overlap`,
      );
    }
    previousBoundary = tier.upTo;
  });
}

/**
 * A stored example must say where it came from and carry its own arithmetic.
 * Without `basis`, a derived figure would be indistinguishable from a figure
 * the source page prints, which is a claim the file should not blur.
 */
function validateVerification(
  verification: unknown,
  path: string,
  issues: string[],
) {
  if (verification === undefined) return;
  if (!isRecord(verification)) {
    issues.push(`${path}: must be an object when present`);
    return;
  }
  if (
    verification.basis !== "official_worked_example" &&
    verification.basis !== "derived_from_table"
  ) {
    issues.push(
      `${path}.basis: must be "official_worked_example" or "derived_from_table"`,
    );
  }
  if (!Array.isArray(verification.examples)) {
    issues.push(`${path}.examples: must be an array`);
    return;
  }
  verification.examples.forEach((raw: unknown, index: number) => {
    const exPath = `${path}.examples[${index}]`;
    if (!isRecord(raw)) {
      issues.push(`${exPath}: must be an object`);
      return;
    }
    if (!isFiniteNumber(raw.monthlyRequests) || raw.monthlyRequests < 0) {
      issues.push(`${exPath}.monthlyRequests: must be a number >= 0`);
    }
    if (!isFiniteNumber(raw.expectedAmount) || raw.expectedAmount < 0) {
      issues.push(`${exPath}.expectedAmount: must be a number >= 0`);
    }
    if (typeof raw.why !== "string" || raw.why === "") {
      issues.push(`${exPath}.why: must state the arithmetic it reproduces`);
    }
  });
}

function validateProduct(product: unknown, path: string, issues: string[]) {
  if (!isRecord(product)) {
    issues.push(`${path}: product must be an object`);
    return;
  }
  const typed = product as unknown as PricingProduct;

  // Product names are shown verbatim, so they must exist in the data file.
  if (typeof typed.displayName !== "string" || typed.displayName === "") {
    issues.push(`${path}.displayName: must be a non-empty string`);
  }
  if (typed.sku !== undefined && (typeof typed.sku !== "string" || typed.sku === "")) {
    issues.push(`${path}.sku: must be a non-empty string when present`);
  }
  if (typed.billingModel !== "progressive_tier" && typed.billingModel !== "flat_rate") {
    issues.push(
      `${path}.billingModel: must be "progressive_tier" or "flat_rate"`,
    );
    return;
  }
  if (typed.unit !== "event" && typed.unit !== "session") {
    issues.push(`${path}.unit: must be "event" or "session"`);
  }

  if (typed.free !== undefined) {
    if (!isRecord(typed.free) || !isFiniteNumber(typed.free.quantity) || typed.free.quantity < 0) {
      issues.push(`${path}.free.quantity: must be a number >= 0`);
    }
  }

  validateVerification(typed.verification, `${path}.verification`, issues);

  if (typed.billingModel === "progressive_tier") {
    validateTiers(typed.tiers, `${path}.tiers`, issues);
    // A progressive table that stops at a finite boundary would silently
    // undercharge every request above it, so the top tier must be open-ended.
    const tiers = typed.tiers as PricingTier[];
    if (Array.isArray(tiers) && tiers.length > 0) {
      const top = tiers[tiers.length - 1] as unknown as Record<string, unknown>;
      if (isRecord(top) && top.upTo !== null) {
        issues.push(
          `${path}.tiers: the final tier must have a null upper bound so high volumes are still priced`,
        );
      }
    }
  } else if (!isFiniteNumber(typed.pricePer1000) || typed.pricePer1000 < 0) {
    issues.push(`${path}.pricePer1000: must be a number >= 0`);
  }
}

export function validateProviderPricing(input: unknown): ValidationResult<ProviderPricing> {
  const issues: string[] = [];

  if (!isRecord(input)) {
    return { ok: false, value: null, issues: ["provider pricing: must be an object"] };
  }

  if (
    typeof input.provider !== "string" ||
    !VALID_PROVIDERS.includes(input.provider)
  ) {
    issues.push(
      `provider: must be one of ${VALID_PROVIDERS.join(", ")} (got ${JSON.stringify(input.provider)})`,
    );
  }
  if (typeof input.displayName !== "string" || input.displayName === "") {
    issues.push("displayName: must be a non-empty string");
  }
  if (
    typeof input.currency !== "string" ||
    !VALID_CURRENCIES.includes(input.currency)
  ) {
    issues.push(`currency: must be one of ${VALID_CURRENCIES.join(", ")}`);
  }
  validateSource(input.source, "source", issues);

  if (!isRecord(input.products) || Object.keys(input.products).length === 0) {
    issues.push("products: must be a non-empty object");
  } else {
    for (const [productId, product] of Object.entries(input.products)) {
      validateProduct(product, `products.${productId}`, issues);
    }
  }

  if (issues.length > 0) return { ok: false, value: null, issues };
  return { ok: true, value: input as unknown as ProviderPricing, issues: [] };
}

export function validateZonaticPricing(input: unknown): ValidationResult<ZonaticPricing> {
  const issues: string[] = [];

  if (!isRecord(input)) {
    return { ok: false, value: null, issues: ["zonatic pricing: must be an object"] };
  }

  if (input.provider !== "zonatic") {
    issues.push('provider: must be "zonatic"');
  }
  if (typeof input.displayName !== "string" || input.displayName === "") {
    issues.push("displayName: must be a non-empty string");
  }
  if (
    typeof input.currency !== "string" ||
    !VALID_CURRENCIES.includes(input.currency)
  ) {
    issues.push(`currency: must be one of ${VALID_CURRENCIES.join(", ")}`);
  }
  validateSource(input.source, "source", issues);

  if (!isRecord(input.plans) || Object.keys(input.plans).length === 0) {
    issues.push("plans: must be a non-empty object");
  } else {
    for (const [planId, rawPlan] of Object.entries(input.plans)) {
      const path = `plans.${planId}`;
      if (!isRecord(rawPlan)) {
        issues.push(`${path}: must be an object`);
        continue;
      }
      const plan = rawPlan as unknown as ZonaticPlan;

      if (typeof plan.labelKey !== "string" || plan.labelKey === "") {
        issues.push(`${path}.labelKey: must be a non-empty string`);
      }
      // A negotiated plan has no price by design; a published one must.
      if (plan.monthlyPrice !== null && (!isFiniteNumber(plan.monthlyPrice) || plan.monthlyPrice < 0)) {
        issues.push(`${path}.monthlyPrice: must be a number >= 0, or null`);
      }
      if (
        plan.includedRequests !== null &&
        (!isFiniteNumber(plan.includedRequests) || plan.includedRequests <= 0)
      ) {
        issues.push(`${path}.includedRequests: must be a number > 0, or null`);
      }
      if (plan.monthlyPrice !== null && plan.includedRequests === null) {
        issues.push(`${path}: a priced plan must declare includedRequests`);
      }
      if (plan.negotiated !== true && plan.monthlyPrice === null) {
        issues.push(`${path}: only a negotiated plan may omit monthlyPrice`);
      }
    }
  }

  if (issues.length > 0) return { ok: false, value: null, issues };
  return { ok: true, value: input as unknown as ZonaticPricing, issues: [] };
}

/**
 * The FX table.
 *
 * Only shape and plausibility are checked here. Whether a rate is an assumption
 * is expressed by `verified: false`, which the UI is required to disclose —
 * this function cannot tell a good rate from a convenient one.
 */
export function validateFxConfig(input: unknown): ValidationResult<FxConfig> {
  const issues: string[] = [];

  if (!isRecord(input)) {
    return { ok: false, value: null, issues: ["fx config: must be an object"] };
  }

  if (
    typeof input.baseCurrency !== "string" ||
    !VALID_CURRENCIES.includes(input.baseCurrency)
  ) {
    issues.push(`baseCurrency: must be one of ${VALID_CURRENCIES.join(", ")}`);
  }

  if (!isRecord(input.rates) || Object.keys(input.rates).length === 0) {
    issues.push("rates: must be a non-empty object");
  } else {
    for (const [code, rawRate] of Object.entries(input.rates)) {
      const path = `rates.${code}`;
      if (!VALID_CURRENCIES.includes(code)) {
        issues.push(`${path}: unknown currency code`);
        continue;
      }
      if (!isRecord(rawRate)) {
        issues.push(`${path}: must be an object`);
        continue;
      }
      if (!isFiniteNumber(rawRate.value) || rawRate.value <= 0) {
        issues.push(`${path}.value: must be a number > 0`);
      }
      if (typeof rawRate.source !== "string" || rawRate.source === "") {
        issues.push(`${path}.source: must be a non-empty string`);
      }
      if (typeof rawRate.verified !== "boolean") {
        issues.push(`${path}.verified: must be a boolean`);
      }
      if (
        typeof rawRate.checkedAt !== "string" ||
        !ISO_DATE.test(rawRate.checkedAt)
      ) {
        issues.push(`${path}.checkedAt: must be an ISO date (YYYY-MM-DD)`);
      }
    }
  }

  if (issues.length > 0) return { ok: false, value: null, issues };
  return { ok: true, value: input as unknown as FxConfig, issues: [] };
}

/** Throwing wrapper, used at module load so bad data fails loudly. */
export function assertValidPricing<T>(
  result: ValidationResult<T>,
  label: string,
): T {
  if (!result.ok) {
    throw new Error(
      `Invalid pricing configuration in ${label}:\n  - ${result.issues.join("\n  - ")}`,
    );
  }
  return result.value;
}

export type { CurrencyCode };