import type { CurrencyCode } from "./types";

/**
 * Display formatting for the cost estimator.
 *
 * Kept out of the component so the same rules apply anywhere a figure is
 * rendered.
 *
 * Locale is pinned explicitly per currency. Relying on the runtime default
 * would make server-rendered and client-rendered output differ, which React
 * reports as a hydration mismatch — the static HTML is generated on the host
 * and hydrated in the browser.
 */

/** `1000000` → `1.000.000` (Indonesian grouping). */
export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(
    Math.round(value),
  );
}

/**
 * Fraction digits follow the currency, not the size of the number.
 *
 * IDR has no practical subunit here, so it renders without decimals. USD must
 * keep two: Google prices per 1,000 events, so a volume just past a tier
 * boundary lands on a fraction of a cent-scale unit. Rounding those to whole
 * dollars would print a real charge as `$0`.
 */
export function formatCurrency(
  value: number | null,
  currency: CurrencyCode,
): string {
  if (value === null || !Number.isFinite(value)) return "—";
  const isIdr = currency === "IDR";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency,
    minimumFractionDigits: isIdr ? 0 : 2,
    maximumFractionDigits: isIdr ? 0 : 2,
  }).format(isIdr ? Math.round(value) : value);
}

/** Local currency symbol used by the rate statement. */
function currencyPrefix(currency: CurrencyCode): string {
  return currency === "IDR" ? "Rp" : "US$";
}

/**
 * The disclosed conversion, e.g. `1 USD ≈ Rp16.000`.
 *
 * Built from a symbol and `formatNumber` rather than `Intl` currency style so
 * the string is byte-identical on the host and in the browser. It is a stated
 * assumption, never described as a live rate.
 */
export function formatRateStatement(
  from: CurrencyCode,
  to: CurrencyCode,
  rate: number,
): string {
  return `1 ${from} ≈ ${currencyPrefix(to)}${formatNumber(rate)}`;
}

/** Compact form for the request input, e.g. `1.000.000`. */
export function formatRequests(value: number): string {
  return formatNumber(value);
}

/** Accepts digits only, so a pasted string cannot inject anything odd. */
export function parseRequestInput(raw: string): number | null {
  const digits = raw.replace(/[^0-9]/g, "");
  if (digits === "") return 0;
  const parsed = Number.parseInt(digits, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

const MONTHS = {
  id: [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
  ],
  en: [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ],
} as const;

/**
 * `2026-10-04` -> `4 Oktober 2026` / `Oct 4, 2026`.
 *
 * Month names are spelled out rather than delegated to `Intl.DateTimeFormat`,
 * whose output depends on the runtime's ICU data. This value is rendered into
 * statically generated HTML on the host and hydrated in the browser, so a
 * locale-dependent difference would surface as a hydration mismatch.
 */
export function formatCheckedAt(iso: string, locale: "id" | "en"): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return iso;
  const [, year, month, day] = match;
  const monthIndex = Number.parseInt(month, 10) - 1;
  const monthName = MONTHS[locale][monthIndex];
  if (!monthName) return iso;
  return locale === "id"
    ? `${Number.parseInt(day, 10)} ${monthName} ${year}`
    : `${monthName} ${Number.parseInt(day, 10)}, ${year}`;
}