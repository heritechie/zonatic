import { describe, expect, it } from "vitest";
import googleData from "../data/google.json";
import zonaticData from "../data/zonatic.json";
import {
  assertValidPricing,
  validateProviderPricing,
  validateZonaticPricing,
} from "../index";

/** Deep clone so each mutation test gets a clean copy of the real fixture. */
function providerFixture(): Record<string, unknown> {
  return structuredClone(googleData) as unknown as Record<string, unknown>;
}

function zonaticFixture(): Record<string, unknown> {
  return structuredClone(zonaticData) as unknown as Record<string, unknown>;
}

function firstTier(config: Record<string, unknown>) {
  const products = config.products as Record<string, Record<string, unknown>>;
  return products.geocoding.tiers as Record<string, unknown>[];
}

describe("bundled pricing files", () => {
  it("passes validation as shipped", () => {
    expect(validateProviderPricing(googleData).ok).toBe(true);
    expect(validateZonaticPricing(zonaticData).ok).toBe(true);
  });
});

describe("provider pricing validation", () => {
  it("rejects a non-object", () => {
    const result = validateProviderPricing(null);
    expect(result.ok).toBe(false);
    expect(result.issues[0]).toMatch(/must be an object/);
  });

  it("rejects a missing provider", () => {
    const config = providerFixture();
    delete config.provider;
    const result = validateProviderPricing(config);
    expect(result.ok).toBe(false);
    expect(result.issues.join()).toMatch(/provider: must be one of/);
  });

  it("rejects an invalid currency", () => {
    const config = providerFixture();
    config.currency = "EUR";
    const result = validateProviderPricing(config);
    expect(result.ok).toBe(false);
    expect(result.issues.join()).toMatch(/currency/);
  });

  it("rejects a missing source", () => {
    const config = providerFixture();
    delete config.source;
    const result = validateProviderPricing(config);
    expect(result.ok).toBe(false);
    expect(result.issues.join()).toMatch(/missing source/);
  });

  it("rejects a malformed checkedAt date", () => {
    const config = providerFixture();
    (config.source as Record<string, unknown>).checkedAt = "04/10/2026";
    expect(validateProviderPricing(config).issues.join()).toMatch(/ISO date/);
  });

  it("requires a url when the price is marked verified", () => {
    const config = providerFixture();
    delete (config.source as Record<string, unknown>).url;
    expect(validateProviderPricing(config).issues.join()).toMatch(/url: required/);
  });

  it("rejects a negative tier price", () => {
    const config = providerFixture();
    firstTier(config)[0].pricePer1000 = -1;
    expect(validateProviderPricing(config).issues.join()).toMatch(
      /pricePer1000: must be a number >= 0/,
    );
  });

  it("rejects a non-numeric tier price", () => {
    const config = providerFixture();
    firstTier(config)[0].pricePer1000 = "cheap";
    expect(validateProviderPricing(config).issues.join()).toMatch(/pricePer1000/);
  });

  it("rejects descending tier boundaries", () => {
    const config = providerFixture();
    firstTier(config)[1].upTo = 50_000;
    expect(validateProviderPricing(config).issues.join()).toMatch(
      /must be greater than the previous boundary/,
    );
  });

  it("rejects overlapping tier boundaries", () => {
    const config = providerFixture();
    firstTier(config)[1].upTo = 100_000;
    expect(validateProviderPricing(config).ok).toBe(false);
  });

  it("rejects a null upper bound that is not last", () => {
    const config = providerFixture();
    const tiers = firstTier(config);
    tiers[0].upTo = null;
    expect(validateProviderPricing(config).issues.join()).toMatch(
      /only the final tier may have a null upper bound/,
    );
  });

  it("rejects a zero or negative tier boundary", () => {
    const config = providerFixture();
    firstTier(config)[0].upTo = 0;
    expect(validateProviderPricing(config).ok).toBe(false);
  });

  it("rejects an empty tier list", () => {
    const config = providerFixture();
    (config.products as Record<string, Record<string, unknown>>).geocoding.tiers = [];
    expect(validateProviderPricing(config).issues.join()).toMatch(/non-empty array/);
  });

  it("rejects an unknown billing model", () => {
    const config = providerFixture();
    (config.products as Record<string, Record<string, unknown>>).geocoding.billingModel =
      "per_seat";
    expect(validateProviderPricing(config).issues.join()).toMatch(/billingModel/);
  });

  it("rejects an unknown unit", () => {
    const config = providerFixture();
    (config.products as Record<string, Record<string, unknown>>).geocoding.unit =
      "seat";
    expect(validateProviderPricing(config).issues.join()).toMatch(/unit/);
  });

  it("rejects an empty products map", () => {
    const config = providerFixture();
    config.products = {};
    expect(validateProviderPricing(config).issues.join()).toMatch(/products/);
  });
});

describe("zonatic pricing validation", () => {
  it("rejects a wrong provider id", () => {
    const config = zonaticFixture();
    config.provider = "google_maps";
    expect(validateZonaticPricing(config).issues.join()).toMatch(
      /provider: must be "zonatic"/,
    );
  });

  it("rejects an invalid currency", () => {
    const config = zonaticFixture();
    config.currency = "BTC";
    expect(validateZonaticPricing(config).issues.join()).toMatch(/currency/);
  });

  it("rejects a negative monthly price", () => {
    const config = zonaticFixture();
    (config.plans as Record<string, Record<string, unknown>>).developer.monthlyPrice = -1;
    expect(validateZonaticPricing(config).issues.join()).toMatch(
      /monthlyPrice: must be a number >= 0/,
    );
  });

  it("rejects a non-numeric monthly price", () => {
    const config = zonaticFixture();
    (config.plans as Record<string, Record<string, unknown>>).growth.monthlyPrice =
      "Rp799K";
    expect(validateZonaticPricing(config).issues.join()).toMatch(/monthlyPrice/);
  });

  it("rejects invalid includedRequests", () => {
    const config = zonaticFixture();
    (config.plans as Record<string, Record<string, unknown>>).growth.includedRequests = 0;
    expect(validateZonaticPricing(config).issues.join()).toMatch(/includedRequests/);
  });

  it("rejects a priced plan with no included volume", () => {
    const config = zonaticFixture();
    const plans = config.plans as Record<string, Record<string, unknown>>;
    plans.developer.includedRequests = null;
    expect(validateZonaticPricing(config).issues.join()).toMatch(
      /priced plan must declare includedRequests/,
    );
  });

  it("rejects a non-negotiated plan with no price", () => {
    const config = zonaticFixture();
    const plans = config.plans as Record<string, Record<string, unknown>>;
    plans.growth.monthlyPrice = null;
    expect(validateZonaticPricing(config).issues.join()).toMatch(
      /only a negotiated plan may omit monthlyPrice/,
    );
  });

  it("accepts a negotiated plan with null price and null volume", () => {
    const config = zonaticFixture();
    const plans = config.plans as Record<string, Record<string, unknown>>;
    plans.business.monthlyPrice = null;
    plans.business.includedRequests = null;
    plans.business.negotiated = true;
    expect(validateZonaticPricing(config).ok).toBe(true);
  });

  it("rejects an empty plans map", () => {
    const config = zonaticFixture();
    config.plans = {};
    expect(validateZonaticPricing(config).issues.join()).toMatch(/plans/);
  });
});

describe("assertValidPricing", () => {
  it("returns the value when valid", () => {
    expect(
      assertValidPricing(validateProviderPricing(googleData), "google"),
    ).toBe(googleData);
  });

  it("throws with every issue listed when invalid", () => {
    const config = providerFixture();
    delete config.provider;
    config.currency = "XYZ";
    expect(() =>
      assertValidPricing(validateProviderPricing(config), "data/test.json"),
    ).toThrow(/data\/test\.json[\s\S]*provider: must be one of[\s\S]*currency/);
  });
});
describe("provider id, tier coverage, and effective window", () => {
  it("rejects an unknown provider id", () => {
    const config = providerFixture();
    config.provider = "google";
    expect(validateProviderPricing(config).issues.join()).toMatch(
      /provider: must be one of google_maps, zonatic/,
    );
  });

  it("rejects a progressive table with a finite top boundary", () => {
    const config = providerFixture();
    const tiers = firstTier(config);
    tiers[tiers.length - 1].upTo = 5_000_000;
    expect(validateProviderPricing(config).issues.join()).toMatch(
      /final tier must have a null upper bound/,
    );
  });

  it("accepts a well-formed effective window", () => {
    const config = providerFixture();
    (config.source as Record<string, unknown>).effectiveFrom = "2025-03-01";
    (config.source as Record<string, unknown>).effectiveUntil = "2027-12-31";
    expect(validateProviderPricing(config).ok).toBe(true);
  });

  it("rejects a malformed effective date", () => {
    const config = providerFixture();
    (config.source as Record<string, unknown>).effectiveFrom = "2025/03/01";
    expect(validateProviderPricing(config).issues.join()).toMatch(
      /effectiveFrom: must be an ISO date/,
    );
  });

  it("rejects a backwards effective window", () => {
    const config = providerFixture();
    (config.source as Record<string, unknown>).effectiveFrom = "2027-01-01";
    (config.source as Record<string, unknown>).effectiveUntil = "2026-01-01";
    expect(validateProviderPricing(config).issues.join()).toMatch(
      /effectiveUntil must not precede effectiveFrom/,
    );
  });
});
