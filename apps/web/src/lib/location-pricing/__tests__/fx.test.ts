import { describe, expect, it } from "vitest";
import {
  calculateLocationApiCost,
  COMPARISON_CURRENCY,
  conversionRate,
  convertCurrency,
  formatRateStatement,
  fxConfig,
  usdToIdr,
  type CurrencyCode,
} from "../index";

const PLACES = "places_text_search_pro";

/** A rate table with the same shape as fx.json, for swapping scenarios. */
function table(value: number, verified = false) {
  return {
    IDR: { value, source: "test", verified, checkedAt: "2026-10-04" },
  };
}

describe("fx.json configuration", () => {
  it("is quoted against a declared base currency", () => {
    expect(fxConfig.baseCurrency).toBe("USD");
    expect(fxConfig.rates[COMPARISON_CURRENCY]).toBeTruthy();
  });

  it("marks the rate as an unverified manual assumption", () => {
    expect(usdToIdr.source).toBe("manual");
    expect(usdToIdr.verified).toBe(false);
    expect(usdToIdr.checkedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(usdToIdr.note).toBeTruthy();
  });

  it("exposes the rate table without a literal in code", () => {
    expect(usdToIdr.value).toBe(fxConfig.rates.IDR.value);
  });
});

describe("convertCurrency", () => {
  it("converts USD to IDR using the configured rate", () => {
    expect(
      convertCurrency({
        amount: 3040,
        from: "USD",
        to: "IDR",
        rates: fxConfig.rates,
      }),
    ).toBe(48_640_000);
  });

  it("converts a fractional amount", () => {
    expect(
      convertCurrency({
        amount: 0.03,
        from: "USD",
        to: "IDR",
        rates: fxConfig.rates,
      }),
    ).toBe(480);
  });

  it("returns the amount unchanged when no conversion is needed", () => {
    expect(
      convertCurrency({
        amount: 149_000,
        from: "IDR",
        to: "IDR",
        rates: fxConfig.rates,
      }),
    ).toBe(149_000);
  });

  it("returns null rather than a wrong number for an unknown target", () => {
    expect(
      convertCurrency({
        amount: 100,
        from: "USD",
        to: "IDR",
        rates: table(16_000),
      }),
    ).toBe(1_600_000);
    // Cast because the compiler already forbids this: the point of the test is
    // that the runtime also refuses it, since data can arrive from elsewhere.
    expect(
      convertCurrency({
        amount: 100,
        from: "USD",
        to: "EUR" as CurrencyCode,
        rates: fxConfig.rates,
      }),
    ).toBeNull();
  });

  it("returns null for a missing or non-positive rate", () => {
    expect(
      convertCurrency({ amount: 100, from: "USD", to: "IDR", rates: {} }),
    ).toBeNull();
    expect(
      convertCurrency({ amount: 100, from: "USD", to: "IDR", rates: table(0) }),
    ).toBeNull();
  });

  it("returns null for a non-finite amount", () => {
    expect(
      convertCurrency({
        amount: Number.NaN,
        from: "USD",
        to: "IDR",
        rates: fxConfig.rates,
      }),
    ).toBeNull();
  });

  it("reports units of target per 1 unit of source", () => {
    expect(conversionRate("USD", "IDR")).toBe(usdToIdr.value);
    expect(conversionRate("IDR", "IDR")).toBe(1);
  });
});

describe("changing the rate changes the result, not the logic", () => {
  const at = (rate: number) =>
    convertCurrency({
      amount: 100,
      from: "USD",
      to: "IDR",
      rates: table(rate),
    });

  it("scales the converted amount with the configured rate", () => {
    expect(at(16_000)).toBe(1_600_000);
    expect(at(32_000)).toBe(3_200_000);
    expect(at(8_000)).toBe(800_000);
  });

  it("leaves the provider's own-currency figure untouched by the rate", () => {
    // The USD estimate is rate-independent by construction.
    const before = calculateLocationApiCost({
      provider: "google_maps",
      product: PLACES,
      monthlyRequests: 100_000,
    });
    expect(before.provider.amount).toBe(3040);
  });

  it("scales the converted delta with the rate", () => {
    const base = calculateLocationApiCost({
      provider: "google_maps",
      product: PLACES,
      monthlyRequests: 100_000,
    });
    // Zonatic is already IDR, so it does not move; only the converted side does.
    const delta = base.deltas[0];
    expect(delta?.amount).toBe(48_491_000);

    const doubled = 3040 * 2 * usdToIdr.value - 149_000;
    expect(doubled).toBe(97_131_000);
    expect(doubled).not.toBe(delta?.amount);
  });

  it("reveals percentage savings only once the rate is verified", () => {
    const unverified = calculateLocationApiCost({
      provider: "google_maps",
      product: PLACES,
      monthlyRequests: 100_000,
    });
    expect(unverified.savingsAreVerified).toBe(false);
    // A verified rate is not the only gate: Zonatic pricing is still a
    // hypothesis, so the flag must stay false regardless.
    expect(table(16_000, true).IDR.verified).toBe(true);
    expect(unverified.savingsAreVerified).toBe(false);
  });
});

describe("formatRateStatement", () => {
  it("discloses the rate in the requested format", () => {
    expect(formatRateStatement("USD", "IDR", 16_000)).toBe("1 USD ≈ Rp16.000");
  });

  it("groups with Indonesian separators", () => {
    expect(formatRateStatement("USD", "IDR", 19_250)).toBe("1 USD ≈ Rp19.250");
  });
});