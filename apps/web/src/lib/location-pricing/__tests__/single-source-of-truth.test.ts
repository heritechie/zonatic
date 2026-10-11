import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";
import fxData from "../data/fx.json";
import googleData from "../data/google.json";
import zonaticData from "../data/zonatic.json";

/**
 * Architectural guard.
 *
 * Prices and rates must live in `./data/*.json` and nowhere else. If a figure
 * ever gets typed into a component or a calculation module, the pricing file
 * stops being the single source of truth and the UI can silently disagree with
 * the data. These tests fail the moment that happens.
 */

const SRC_ROOT = join(import.meta.dirname, "..", "..", "..");
const DATA_DIR = join(SRC_ROOT, "lib", "location-pricing", "data");

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return walk(full);
    return /\.(ts|tsx)$/.test(entry) ? [full] : [];
  });
}

/**
 * Production TypeScript only.
 *
 * Test files are excluded on purpose: they must spell out expected figures to
 * assert them, which is the opposite of what this guard is checking. The rule
 * is that no *shipped* module restates a number that `data/*.json` owns.
 */
const productionTs = walk(SRC_ROOT).filter(
  (file) => !relative(SRC_ROOT, file).includes(`${sep}__tests__${sep}`),
);

/** Production files that restate a literal owned by a data file. */
function filesContaining(pattern: RegExp): string[] {
  return productionTs
    .filter((file) => pattern.test(readFileSync(file, "utf-8")))
    .map((file) => relative(SRC_ROOT, file))
    .sort();
}

/** `16000`, `16_000`, `1.6000e4` — any spelling of the same number. */
const rateLiteral = /(?<![\d.])1_?6_?000(?![\d])/;
const developerPrice = /(?<![\d.])149_?000(?![\d])/;
const growthPrice = /(?<![\d.])799_?000(?![\d])/;
/** A Google SKU appears exactly once: in the pricing file that declares it. */
const placesSku = /4FDA-34B1-A910/;

describe("exchange rate lives only in fx.json", () => {
  it("is restated by no production module", () => {
    expect(filesContaining(rateLiteral)).toEqual([]);
  });

  it("is declared in the shipped config", () => {
    expect(
      rateLiteral.test(readFileSync(join(DATA_DIR, "fx.json"), "utf-8")),
    ).toBe(true);
    expect(fxData.rates.IDR.value).toBe(16_000);
  });
});

describe("Zonatic prices live only in zonatic.json", () => {
  it("keeps the Developer plan price out of production code", () => {
    expect(filesContaining(developerPrice)).toEqual([]);
    expect(zonaticData.plans.developer.monthlyPrice).toBe(149_000);
  });

  it("keeps the Growth plan price out of production code", () => {
    expect(filesContaining(growthPrice)).toEqual([]);
    expect(zonaticData.plans.growth.monthlyPrice).toBe(799_000);
  });
});

describe("Google prices live only in google.json", () => {
  it("keeps the Places SKU out of production code", () => {
    expect(filesContaining(placesSku)).toEqual([]);
    expect(googleData.products.places_text_search_pro.sku).toBe("4FDA-34B1-A910");
  });
});