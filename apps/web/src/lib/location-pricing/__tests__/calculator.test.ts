import { describe, expect, it } from "vitest";
import {
  availableProducts,
  calculateLocationApiCost,
  COMPARISON_CURRENCY,
  planForVolume,
  progressiveTierCost,
  REQUEST_PRESETS,
  sanitizeMonthlyRequests,
  usdToIdr,
  googlePricing,
  zonaticPricing,
  type CalculationInput,
} from "../index";

const PLACES = "places_text_search_pro";
const GEOCODING = "geocoding";

/** Cost for the Google side only, in Google's own currency (USD). */
function googleAmount(product: string, monthlyRequests: number): number | null {
  return calculateLocationApiCost({
    provider: "google_maps",
    product,
    monthlyRequests,
  }).provider.amount;
}

/** Cost for the Zonatic side only, in Zonatic's own currency (IDR). */
function zonaticAmount(monthlyRequests: number): number | null {
  return calculateLocationApiCost({
    provider: "google_maps",
    product: PLACES,
    monthlyRequests,
  }).zonatic.amount;
}

function calc(overrides: Partial<CalculationInput> = {}) {
  return calculateLocationApiCost({
    provider: "google_maps",
    product: PLACES,
    monthlyRequests: 100_000,
    ...overrides,
  });
}

describe("Google product catalogue", () => {
  it("is verified with a source, a documentation URL, and a checked date", () => {
    expect(googlePricing.provider).toBe("google_maps");
    expect(googlePricing.currency).toBe("USD");
    expect(googlePricing.source.verified).toBe(true);
    expect(googlePricing.source.url).toBe(
      "https://developers.google.com/maps/billing-and-pricing/pricing",
    );
    expect(googlePricing.source.documentationUrl).toContain(
      "places/web-service/overview",
    );
    expect(googlePricing.source.checkedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("offers Places Text Search Pro and Geocoding, with Places first", () => {
    expect(availableProducts().map((p) => p.id)).toEqual([PLACES, GEOCODING]);
  });

  it("does not offer Autocomplete", () => {
    expect(availableProducts().map((p) => p.id)).not.toContain("autocomplete");
    expect(googlePricing.products).not.toHaveProperty("autocomplete");
  });

  it("names every product explicitly, with its SKU", () => {
    // A bare "Google Places API" label would imply one price for the whole
    // API family, which is false: Places pricing varies per SKU.
    for (const p of availableProducts()) {
      expect(p.displayName).toMatch(/^Google /);
      expect(p.sku).toBeTruthy();
    }
    expect(availableProducts()[0].displayName).toBe(
      "Google Places API — Text Search Pro",
    );
    expect(availableProducts()[0].sku).toBe("4FDA-34B1-A910");
  });
});

describe("Places API Text Search Pro — free cap and progressive tiers", () => {
  it("charges nothing up to and including the 5,000 free cap", () => {
    expect(googleAmount(PLACES, 0)).toBe(0);
    expect(googleAmount(PLACES, 1_000)).toBe(0);
    expect(googleAmount(PLACES, 5_000)).toBe(0);
  });

  it("charges only the volume above the free cap", () => {
    // 5,000 free + 5,000 @ $32.00/1,000 = 5 x 32 = $160
    expect(googleAmount(PLACES, 10_000)).toBe(160);
  });

  it("does NOT bill the free volume at the paid rate", () => {
    // The error this guards against: 100,000 x $32.00/1,000 = $3,200.
    expect(googleAmount(PLACES, 100_000)).not.toBe(3200);
    expect(googleAmount(PLACES, 100_000)).toBe(3040);
  });

  it("spans every band progressively rather than at one flat rate", () => {
    // 95,000 @ 32 = 3,040
    // + 400,000 @ 25.60 = 10,240  -> 13,280
    // + 500,000 @ 19.20 =  9,600  -> 22,880
    // + 4,000,000 @ 9.60 = 38,400 -> 61,280
    // + 5,000,000 @ 2.40 = 12,000 -> 73,280
    expect(googleAmount(PLACES, 500_000)).toBe(13_280);
    expect(googleAmount(PLACES, 1_000_000)).toBe(22_880);
    expect(googleAmount(PLACES, 5_000_000)).toBe(61_280);
    expect(googleAmount(PLACES, 10_000_000)).toBe(73_280);
  });

  it("would be materially wrong at a single-tier price", () => {
    const requests = 10_000_000;
    const firstTierFlat = (requests * 32) / 1000;
    expect(googleAmount(PLACES, requests)).not.toBe(firstTierFlat);
    expect(firstTierFlat).toBe(320_000);
    expect(googleAmount(PLACES, requests)).toBeLessThan(firstTierFlat);
  });

  it("reproduces every example recorded in the pricing file", () => {
    const product = googlePricing.products[PLACES];
    const examples = product.verification?.examples ?? [];
    expect(examples.length).toBeGreaterThan(0);
    for (const ex of examples) {
      expect({
        requests: ex.monthlyRequests,
        actual: googleAmount(PLACES, ex.monthlyRequests),
      }).toEqual({
        requests: ex.monthlyRequests,
        actual: ex.expectedAmount,
      });
    }
  });

  it("records how its examples were obtained", () => {
    expect(googlePricing.products[PLACES].verification?.basis).toBe(
      "derived_from_table",
    );
  });
});

describe("Places tier boundaries", () => {
  it("does not cross into the next band at the boundary", () => {
    expect(googleAmount(PLACES, 5_000)).toBe(0);
    expect(googleAmount(PLACES, 5_001)).toBe(0.03);
    expect(googleAmount(PLACES, 100_000)).toBe(3040);
    expect(googleAmount(PLACES, 100_001)).toBe(3040.03);
    expect(googleAmount(PLACES, 500_000)).toBe(13_280);
    expect(googleAmount(PLACES, 500_001)).toBe(13_280.02);
    expect(googleAmount(PLACES, 1_000_000)).toBe(22_880);
    expect(googleAmount(PLACES, 1_000_001)).toBe(22_880.01);
  });

  it("keeps sub-cent precision out of the displayed figure", () => {
    // One event past the last boundary is $0.0024, which rounds to whole
    // dollars rather than implying a fraction-of-a-cent charge.
    expect(googleAmount(PLACES, 5_000_001)).toBe(61_280);
  });

  it("spends the free allowance before any paid volume", () => {
    const tiers = [
      { upTo: 100_000, pricePer1000: 5 },
      { upTo: null, pricePer1000: 1 },
    ];
    expect(progressiveTierCost(tiers, 5_000, 5_000)).toBe(0);
    expect(progressiveTierCost(tiers, 5_000, 20_000)).toBe(75);
    expect(progressiveTierCost(tiers, 0, 20_000)).toBe(100);
  });
});

describe("Google Geocoding API", () => {
  it("keeps its own free cap and tier table", () => {
    expect(googleAmount(GEOCODING, 10_000)).toBe(0);
    expect(googleAmount(GEOCODING, 20_000)).toBe(50);
    expect(googleAmount(GEOCODING, 100_000)).toBe(450);
    expect(googleAmount(GEOCODING, 500_000)).toBe(2050);
    expect(googleAmount(GEOCODING, 1_000_000)).toBe(3550);
    expect(googleAmount(GEOCODING, 2_000_000)).toBe(5050);
    expect(googleAmount(GEOCODING, 5_000_000)).toBe(9550);
    expect(googleAmount(GEOCODING, 10_000_000)).toBe(11_450);
  });

  it("is priced from the Essentials SKU", () => {
    expect(googlePricing.products[GEOCODING].sku).toBe("BAC8-4E68-E261");
  });
});

describe("Zonatic plan selection", () => {
  it("remains an unverified pricing hypothesis", () => {
    expect(zonaticPricing.provider).toBe("zonatic");
    expect(zonaticPricing.currency).toBe("IDR");
    expect(zonaticPricing.source.verified).toBe(false);
  });

  it("picks the Free plan at or below 10,000 requests", () => {
    expect(planForVolume(0).labelKey).toBe("planFree");
    expect(planForVolume(10_000).labelKey).toBe("planFree");
    expect(zonaticAmount(10_000)).toBe(0);
  });

  it("picks Developer at 100,000 requests", () => {
    expect(planForVolume(100_000).labelKey).toBe("planDeveloper");
    expect(zonaticAmount(100_000)).toBe(149_000);
  });

  it("picks Growth from 500,000 up to 1,000,000 requests", () => {
    expect(planForVolume(500_000).labelKey).toBe("planGrowth");
    expect(planForVolume(1_000_000).labelKey).toBe("planGrowth");
    expect(zonaticAmount(500_000)).toBe(799_000);
    expect(zonaticAmount(1_000_000)).toBe(799_000);
  });

  it("falls back to the negotiated plan above the highest tier", () => {
    expect(planForVolume(5_000_000).labelKey).toBe("planBusiness");
    expect(planForVolume(10_000_000).labelKey).toBe("planBusiness");
  });

  it("invents no price for a negotiated volume", () => {
    const result = calc({ monthlyRequests: 5_000_000 });
    expect(result.zonatic.amount).toBeNull();
    expect(result.zonatic.unavailableReason).toBeTruthy();
    expect(result.hasNumericComparison).toBe(false);
    expect(result.deltas).toEqual([]);
    // The Google side still resolves.
    expect(result.provider.amount).toBe(61_280);
  });
});

describe("zero and invalid input", () => {
  it("returns zero for zero requests", () => {
    const result = calc({ monthlyRequests: 0 });
    expect(result.provider.amount).toBe(0);
    expect(result.zonatic.amount).toBe(0);
    expect(result.deltas[0]?.amount).toBe(0);
  });

  it("sanitises hostile input", () => {
    expect(sanitizeMonthlyRequests(-1)).toBe(0);
    expect(sanitizeMonthlyRequests(Number.NaN)).toBe(0);
    expect(sanitizeMonthlyRequests(1500.9)).toBe(1500);
    expect(sanitizeMonthlyRequests(1e15)).toBe(1_000_000_000_000);
  });

  it("reports no price for an unknown product instead of guessing", () => {
    const result = calc({ product: "places" });
    expect(result.provider.amount).toBeNull();
    expect(result.hasNumericComparison).toBe(false);
  });
});

describe("comparison output", () => {
  it("converts the Google figure through the configured rate", () => {
    const result = calc({ monthlyRequests: 100_000 });
    expect(result.provider.amount).toBe(3040);
    expect(result.zonatic.amount).toBe(149_000);
    expect(result.deltas[0]?.currency).toBe(COMPARISON_CURRENCY);
    // $3,040 x 16,000 = Rp48,640,000, less Rp149,000
    expect(result.deltas[0]?.amount).toBe(48_491_000);
  });

  it("keeps the Google figure in USD and unconverted", () => {
    // The rate must never leak into the provider's own currency.
    expect(calc({ monthlyRequests: 100_000 }).provider.currency).toBe("USD");
    expect(calc({ monthlyRequests: 100_000 }).provider.amount).toBe(3040);
  });

  it("keeps percentage savings gated while the FX rate is an assumption", () => {
    expect(usdToIdr.verified).toBe(false);
    expect(googlePricing.source.verified).toBe(true);
    expect(calc().savingsAreVerified).toBe(false);
  });

  it("exposes the SKU the figure was priced from", () => {
    expect(calc().provider.sku).toBe("4FDA-34B1-A910");
    expect(calc({ product: GEOCODING }).provider.sku).toBe("BAC8-4E68-E261");
  });

  it("exposes provider provenance on the result", () => {
    expect(calc().provider.source?.checkedAt).toBe(
      googlePricing.source.checkedAt,
    );
  });
});

describe("preset volumes", () => {
  it("all produce a Google figure", () => {
    for (const preset of REQUEST_PRESETS) {
      const result = calc({ monthlyRequests: preset });
      expect(result.input.monthlyRequests).toBe(preset);
      expect(result.provider.amount).not.toBeNull();
    }
  });
});