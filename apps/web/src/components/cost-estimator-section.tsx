"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  availableProducts,
  calculateLocationApiCost,
  COMPARISON_CURRENCY,
  formatCheckedAt,
  formatCurrency,
  formatRateStatement,
  formatRequests,
  parseRequestInput,
  REQUEST_PRESETS,
  usdToIdr,
  type CalculationResult,
  type CostLine,
} from "@/lib/location-pricing";
import type { Content } from "@/content";

/**
 * Location API cost section.
 *
 * Economic argument, not a pricing page and not a competitor comparison.
 * It answers one question: what does this monthly volume cost on each side?
 *
 * Placement: after the use-case band and immediately before the final CTA,
 * so the cost argument lands directly ahead of the conversion button.
 *
 * All arithmetic is delegated to `lib/location-pricing` — this component
 * holds no pricing and no formulas. Changing a price means editing the
 * pricing config, never this file.
 *
 * Accessibility notes:
 *   - Product selection uses native radios inside a fieldset, so keyboard and
 *     screen-reader behaviour comes for free.
 *   - The volume field is a labelled numeric input with `inputMode="numeric"`.
 *   - Focus rings come from the global `:focus-visible` rule in globals.css.
 *   - The difference between the two results is stated in words and with an
 *     icon, never by colour alone.
 */
export function CostEstimatorSection({ content }: { content: Content }) {
  const c = content.costEstimator;
  const products = availableProducts();

  // The default is whatever the pricing file lists first, so adding a product
  // does not require changing this file.
  const [product, setProduct] = useState(products[0]?.id ?? "");
  const [requests, setRequests] = useState<number>(REQUEST_PRESETS[1]);

  const result = useMemo(
    () =>
      calculateLocationApiCost({
        provider: "google_maps",
        product,
        monthlyRequests: requests,
      }),
    [product, requests],
  );

  const hasVolume = requests > 0;

  return (
    <section
      id="cost"
      aria-labelledby="cost-headline"
      className="bg-slate-50 py-20 sm:py-28"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
            {c.eyebrow}
          </p>
          <h2
            id="cost-headline"
            className="mt-4 text-3xl font-bold tracking-tight text-navy-900 sm:text-4xl lg:text-5xl"
          >
            {c.headline}
          </h2>
          <p className="mt-5 text-base leading-7 text-navy-600 sm:text-lg">
            {c.description}
          </p>
        </div>

        <div className="mt-12 rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h3 className="text-lg font-semibold text-navy-900">
            {c.calculator.title}
          </h3>

          <div className="mt-6 grid gap-8 lg:grid-cols-12 lg:gap-10">
            {/* Inputs */}
            <div className="lg:col-span-5">
              <fieldset>
                <legend className="text-sm font-semibold text-navy-900">
                  {c.calculator.productLabel}
                </legend>
                <p className="mt-1 text-[0.8125rem] text-navy-500">
                  {c.calculator.productHint}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {products.map((p) => {
                    const id = `cost-product-${p.id}`;
                    return (
                      <div key={p.id}>
                        <input
                          type="radio"
                          id={id}
                          name="cost-product"
                          value={p.id}
                          checked={product === p.id}
                          onChange={() => setProduct(p.id)}
                          className="peer sr-only"
                        />
                        <label
                          htmlFor={id}
                          className={cn(
                            "inline-flex cursor-pointer items-center rounded-md border px-3.5 py-2 text-sm font-medium transition-colors",
                            "peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-emerald-600",
                            product === p.id
                              ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                              : "border-slate-300 bg-white text-navy-600 hover:bg-slate-50",
                          )}
                        >
                          {p.displayName}
                        </label>
                      </div>
                    );
                  })}
                </div>
              </fieldset>

              <div className="mt-6">
                <label
                  htmlFor="cost-requests"
                  className="block text-sm font-semibold text-navy-900"
                >
                  {c.calculator.requestsLabel}
                </label>
                <p className="mt-1 text-[0.8125rem] text-navy-500">
                  {c.calculator.requestsHint}
                </p>

                <input
                  id="cost-requests"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="off"
                  value={formatRequests(requests)}
                  onChange={(e) => {
                    const parsed = parseRequestInput(e.target.value);
                    if (parsed !== null) setRequests(parsed);
                  }}
                  className="mt-3 w-full rounded-md border border-slate-300 bg-white px-3.5 py-2.5 text-base tabular-nums text-navy-900 shadow-sm transition-colors placeholder:text-navy-300 hover:border-slate-400"
                />

                <div className="mt-3 flex flex-wrap gap-2">
                  {REQUEST_PRESETS.map((preset, i) => (
                    <button
                      key={preset}
                      type="button"
                      aria-pressed={requests === preset}
                      onClick={() => setRequests(preset)}
                      className={cn(
                        "rounded-md border px-3 py-1.5 text-[0.8125rem] font-medium tabular-nums transition-colors",
                        requests === preset
                          ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                          : "border-slate-300 bg-white text-navy-600 hover:bg-slate-50",
                      )}
                    >
                      {c.calculator.presets[i] ?? formatRequests(preset)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Results */}
            <div className="lg:col-span-7">
              {!hasVolume ? (
                <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-navy-500">
                  {c.calculator.emptyState}
                </p>
              ) : (
                <Results result={result} content={content} />
              )}
            </div>
          </div>

          <p className="mt-6 text-xs leading-5 text-navy-400">
            {c.calculator.disclaimer}
          </p>
        </div>

        {/* Why this is not a replacement claim */}
        <div className="mt-10 rounded-xl border border-slate-200 bg-white p-6 sm:p-8">
          <h3 className="text-base font-semibold text-navy-900">
            {c.explainer.title}
          </h3>
          <ul className="mt-4 grid gap-3 sm:grid-cols-3">
            {c.explainer.points.map((point) => (
              <li
                key={point}
                className="rounded-lg bg-slate-50 p-4 text-sm leading-6 text-navy-600"
              >
                {point}
              </li>
            ))}
          </ul>

          <div className="mt-6 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <Link
              href={content.meta.consoleUrl}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
            >
              {c.cta.primary}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <p className="text-sm text-navy-500">{c.cta.secondary}</p>
          </div>
          <p className="mt-3 text-xs text-navy-400">
            {content.common.placeholderRouteNote}
          </p>
        </div>
      </div>
    </section>
  );
}

/**
 * The three comparison states, plus the case where no comparison exists.
 *
 * Modelled as a closed union so an unhandled state is a type error rather than
 * a blank gap in the UI.
 */
type ComparisonOutcome =
  | "zonatic_cheaper"
  | "zonatic_higher"
  | "equal"
  | "unavailable";

/**
 * Fill `{placeholder}` tokens in a copy string.
 *
 * Copy lives in the content files with named placeholders so a translator can
 * reorder the sentence without touching this component; the values are derived
 * from the calculation, never authored here.
 */
function fill(template: string, values: Record<string, string>): string {
  return Object.entries(values).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, value),
    template,
  );
}

/**
 * The two result columns plus the difference.
 *
 * Rendered as a definition list so the label/amount pairing is exposed to
 * assistive technology rather than being purely visual.
 */
function Results({
  result,
  content,
}: {
  result: CalculationResult;
  content: Content;
}) {
  const c = content.costEstimator.calculator;
  const googleCurrency = result.provider.currency;

  /*
   * `deltas` is empty whenever a comparison could not be made — a negotiated
   * Zonatic plan, a product with no published price, or a missing exchange
   * rate. `deltas[0]` is therefore `undefined` in those cases, so it is
   * normalised to `null` once here and every read below is a null check rather
   * than an assumption that a delta exists.
   *
   * The calculator already exposes `hasNumericComparison` for exactly this, but
   * normalising the value is what keeps the component total: a missing
   * comparison must render as a neutral note, never throw.
   */
  const delta = result.deltas[0] ?? null;

  /*
   * Only three outcomes are possible, and only one of them may be described as
   * savings:
   *   - Zonatic below the provider estimate -> savings headline and amount;
   *   - both equal -> neutral headline, no difference amount to report;
   *   - Zonatic above the provider estimate, or no comparison -> neutral
   *     headline.
   *
   * No percentage is rendered in any state. A ratio derived from an unverified
   * exchange rate and a hypothesised Zonatic price would overstate the
   * certainty, so the absolute amount carries the claim on its own.
   */
  const outcome: ComparisonOutcome =
    delta === null
      ? "unavailable"
      : delta.amount > 0
        ? "zonatic_cheaper"
        : delta.amount < 0
          ? "zonatic_higher"
          : "equal";

  /*
   * The volume is a usage figure, so it is always paired with its own unit and
   * never rendered next to a currency amount without saying which is which.
   */
  const volumeNote = {
    provider: result.provider.displayName,
    volume: `${formatRequests(result.input.monthlyRequests)} ${
      c.requestVolumeUnit
    }`,
  };

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2">
        <ResultCard
          title={c.columnProvider}
          note={c.columnProviderNote}
          line={result.provider}
          content={content}
          emphasis={false}
        />
        <ResultCard
          title={c.columnZonatic}
          note={c.columnZonaticNote}
          line={result.zonatic}
          content={content}
          emphasis
        />
      </div>

      <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-sm font-semibold text-navy-900">
            {/*
             * The savings headline is gated on the outcome, not on the amount
             * being large: a saving is only a saving if Zonatic is actually the
             * cheaper side.
             */}
            {outcome === "zonatic_cheaper" ? c.savingsTitle : c.comparisonTitle}
          </span>
          {/* No amount is shown when the two sides match or cannot be compared,
              because there is no difference to report. */}
          {delta !== null && outcome !== "equal" && (
            <span className="text-sm font-semibold tabular-nums text-navy-900">
              {formatCurrency(Math.abs(delta.amount), delta.currency)}
              {c.perMonthSuffix}
            </span>
          )}
        </div>

        {/* Direction is stated in words and by icon, not by colour. */}
        {outcome !== "unavailable" && (
          <p className="mt-2 flex items-center gap-2 text-sm text-navy-600">
            {outcome === "zonatic_cheaper" ? (
              <TrendingDown
                className="h-4 w-4 shrink-0 text-emerald-600"
                aria-hidden="true"
              />
            ) : outcome === "zonatic_higher" ? (
              <TrendingUp
                className="h-4 w-4 shrink-0 text-navy-500"
                aria-hidden="true"
              />
            ) : null}
            {outcome === "zonatic_cheaper" && (
              <span>{fill(c.savingsNote, volumeNote)}</span>
            )}
            {outcome === "zonatic_higher" && (
              <span>{fill(c.higherNote, volumeNote)}</span>
            )}
            {outcome === "equal" && <span>{c.equalNote}</span>}
          </p>
        )}

        {/*
         * A comparison that could not be computed is stated plainly. The two
         * result cards above already explain why, via `unavailableReason`.
         */}
        {outcome === "unavailable" && (
          <p className="mt-2 text-sm text-navy-600">{c.comparisonUnavailable}</p>
        )}

        {/*
         * The conversion is disclosed, never hidden: the reader can reproduce
         * the comparison by hand. It is labelled an assumption, not a live
         * rate, because that is what it is.
         */}
        <p className="mt-2 text-xs text-navy-400">
          {`${c.rateNote} ${formatRateStatement(
            googleCurrency,
            COMPARISON_CURRENCY,
            usdToIdr.value,
          )}.`}
        </p>
        {/*
         * Google's price depends on the SKU and the fields a request asks for,
         * so the figure is only ever presented next to the SKU it came from.
         */}
        <p className="mt-1 text-xs text-navy-400">
          {c.skuNote.replace("{product}", result.provider.displayName)}
        </p>
        <p className="mt-1 text-xs text-navy-400">
          {c.sourceNote.replace(
            "{date}",
            formatCheckedAt(
              result.provider.source?.checkedAt ?? "",
              content.locale,
            ),
          )}
        </p>
      </div>
    </div>
  );
}

function ResultCard({
  title,
  note,
  line,
  content,
  emphasis,
}: {
  title: string;
  note: string;
  line: CostLine;
  content: Content;
  emphasis: boolean;
}) {
  const c = content.costEstimator.calculator;
  // A Zonatic line names the plan the volume landed on; a provider line names
  // the SKU it was priced from. Neither borrows the other's label.
  const detail =
    line.provider === "zonatic"
      ? line.planLabelKey
        ? c.plans[line.planLabelKey as keyof typeof c.plans]
        : null
      : (line.sku ?? null);

  return (
    <div
      className={cn(
        "rounded-lg border p-5",
        emphasis
          ? "border-emerald-200 bg-emerald-50/60"
          : "border-slate-200 bg-white",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-navy-900">{title}</p>
          <p className="mt-0.5 text-xs text-navy-500">{note}</p>
        </div>
        {line.isEstimate && (
          <span className="shrink-0 rounded-full border border-slate-300 bg-white px-2 py-0.5 text-[0.6875rem] font-medium text-navy-500">
            {c.estimateBadge}
          </span>
        )}
      </div>

      <dl className="mt-4">
        <dt className="sr-only">{title}</dt>
        <dd className="text-2xl font-bold tabular-nums tracking-tight text-navy-900">
          {line.amount === null
            ? c.customPlanLabel
            : formatCurrency(line.amount, line.currency)}
        </dd>
        {line.amount !== null && (
          <dd className="mt-1 text-xs text-navy-500">
            {c.perMonthSuffix}
            {detail ? ` · ${detail}` : ""}
          </dd>
        )}
        {line.amount === null && line.unavailableReason && (
          <dd className="mt-1.5 text-xs leading-5 text-navy-500">
            {line.unavailableReason}
          </dd>
        )}
      </dl>
    </div>
  );
}