import fxData from "./data/fx.json";
import { assertValidPricing, validateFxConfig } from "./validate";
import type { ConversionRequest, CurrencyCode, FxConfig, FxRate } from "./types";

/**
 * Currency conversion for the cost comparison.
 *
 * ---------------------------------------------------------------------------
 * ASSUMPTION, NOT A LIVE RATE
 * ---------------------------------------------------------------------------
 * Google quotes in USD and Zonatic quotes in IDR, so comparing the two needs a
 * rate. There is no free, official, stable USD/IDR reference rate to quote,
 * which is exactly why the value is an assumption rather than a fact: it lives
 * in `data/fx.json`, is disclosed next to the result, and keeps percentage
 * savings switched off.
 *
 * No rate literal appears in this file. `convertCurrency` takes the rate table
 * as an argument, so changing the rate means editing `fx.json` — not this
 * module, not `calculator.ts`, and not the React component.
 */

/** The validated rate table, loaded once at module load. */
export const fxConfig: FxConfig = assertValidPricing(
  validateFxConfig(fxData),
  "data/fx.json",
);

/** The currency every comparison is expressed in. */
export const COMPARISON_CURRENCY: CurrencyCode = "IDR";

/** The rate the comparison runs on, derived from config. */
export const usdToIdr: FxRate = (() => {
  const rate = fxConfig.rates[COMPARISON_CURRENCY];
  if (!rate) {
    throw new Error(
      `Invalid pricing configuration in data/fx.json:\n  - rates.${COMPARISON_CURRENCY}: missing the comparison rate`,
    );
  }
  return rate;
})();

/**
 * Convert `amount` from one currency to another using `rates`.
 *
 * Returns `null` when the result cannot be stated — an unknown currency, a
 * missing or non-positive rate — rather than guessing or throwing, so the UI
 * can degrade to "no comparison" instead of showing a fabricated figure.
 */
export function convertCurrency({
  amount,
  from,
  to,
  rates,
}: ConversionRequest): number | null {
  if (!Number.isFinite(amount)) return null;
  if (from === to) return amount;

  const rate = rates[to];
  if (!rate || !Number.isFinite(rate.value) || rate.value <= 0) return null;
  // `baseCurrency` is the table's own base; a table quoted the other way round
  // would need inverting, which this module does not silently attempt.
  if (from !== fxConfig.baseCurrency) return null;

  return amount * rate.value;
}

/** Units of `to` per 1 unit of `from`, or `null` if that cannot be stated. */
export function conversionRate(
  from: CurrencyCode,
  to: CurrencyCode,
  rates: FxConfig["rates"] = fxConfig.rates,
): number | null {
  if (from === to) return 1;
  return convertCurrency({ amount: 1, from, to, rates });
}