import { describe, expect, it } from "vitest";
import { formatCheckedAt, formatCurrency, formatNumber, parseRequestInput } from "../index";

describe("formatNumber", () => {
  it("uses Indonesian grouping", () => {
    expect(formatNumber(1_000_000)).toBe("1.000.000");
    expect(formatNumber(100_000)).toBe("100.000");
    expect(formatNumber(10_000)).toBe("10.000");
  });

  it("never renders a non-finite value", () => {
    expect(formatNumber(Number.NaN)).toBe("—");
  });
});

describe("formatCurrency", () => {
  it("renders IDR with a rupiah sign and no decimals", () => {
    expect(formatCurrency(799_000, "IDR")).toContain("799.000");
  });

  it("renders USD", () => {
    expect(formatCurrency(3550, "USD")).toContain("3.550");
  });

  it("renders a dash for an unknown amount", () => {
    expect(formatCurrency(null, "IDR")).toBe("—");
  });
});

describe("parseRequestInput", () => {
  it("keeps digits only", () => {
    expect(parseRequestInput("1.000.000")).toBe(1_000_000);
    expect(parseRequestInput(" 12abc3 ")).toBe(123);
    expect(parseRequestInput("")).toBe(0);
    expect(parseRequestInput("abc")).toBe(0);
  });
});

describe("formatCheckedAt", () => {
  it("formats an ISO date per locale without Intl", () => {
    expect(formatCheckedAt("2026-10-04", "id")).toBe("4 Oktober 2026");
    expect(formatCheckedAt("2026-10-04", "en")).toBe("Oct 4, 2026");
  });

  it("returns the input unchanged when it is not an ISO date", () => {
    expect(formatCheckedAt("not-a-date", "en")).toBe("not-a-date");
    expect(formatCheckedAt("2026-13", "en")).toBe("2026-13");
  });
});