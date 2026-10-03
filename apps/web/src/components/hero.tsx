import Link from "next/link";
import {
  ArrowRight,
  Database,
  Globe,
  Map as MapIcon,
  Code2,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Content } from "@/content";

/**
 * Two-column hero.
 *
 *   Left   | Z logo brand
 *      ─   | LOCATION INTELLIGENCE eyebrow
 *      ─   | Display headline (two lines + emerald emphasis)
 *      ─   | Description
 *      ─   | [Get started →] [View docs]
 *      ─   | fine-print
 *
 *   Right  | Jakarta map image (hero-jakarta-map.webp)
 *           with overlays: search input, zoom controls,
 *           area badge, summary card.
 *
 * Below the two-column hero, four "pillar" cards run full width
 * across the bottom edge of the section.
 */
export function Hero({ content }: { content: Content }) {
  const h = content.hero;
  return (
    <section
      id="hero"
      className="relative overflow-hidden bg-white pt-28 pb-12 sm:pt-36 sm:pb-16 lg:pt-40 lg:pb-20"
      aria-labelledby="hero-headline"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          {/* Left column — copy + CTAs */}
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
              <span
                aria-hidden="true"
                className="h-1.5 w-1.5 rounded-full bg-emerald-500"
              />
              {h.eyebrow}
            </p>

            <h1
              id="hero-headline"
              className="mt-6 text-4xl font-bold leading-[1.08] tracking-tight text-navy-900 sm:text-5xl lg:text-6xl"
            >
              <span className="block">{h.headlineLine1}</span>
              <span className="block">
                {h.headlineLine2}{" "}
                <span className="text-emerald-700">{h.headlineHighlight}</span>
              </span>
            </h1>

            <p className="mt-6 text-lg leading-8 text-navy-600 sm:text-xl">
              {h.description}
            </p>

            <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
              <Link
                href="#get-started"
                className="group inline-flex items-center justify-center gap-2 rounded-md bg-emerald-600 px-6 py-3 text-[0.95rem] font-semibold text-white shadow-sm hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 transition-colors"
              >
                {h.primaryCta}
                <ArrowRight
                  className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </Link>
              <Link
                href="/docs"
                className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-6 py-3 text-[0.95rem] font-semibold text-navy-800 hover:bg-slate-50 transition-colors"
              >
                {h.secondaryCta}
              </Link>
            </div>

            {h.ctaFineprint ? (
              <p className="mt-5 text-[0.8125rem] text-navy-500">
                {h.ctaFineprint}
              </p>
            ) : null}
          </div>

          {/* Right column — Jakarta map */}
          <div>
            <HeroMapPanel content={content} />
          </div>
        </div>

        {/* Pillars row (4 capability concepts) */}
        <PillarsRow content={content} />
      </div>
    </section>
  );
}

function _BackgroundGrid() {
  return null;
}

function HeroMapPanel({ content }: { content: Content }) {
  const m = content.hero.map;
  return (
    <figure
      className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-md"
      aria-label={content.hero.eyebrow}
    >
      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/assets/maps/hero-jakarta-map.webp"
          alt="Peta Jakarta dengan titik lokasi dan polygon territory"
          className="h-full w-full object-cover"
          loading="eager"
          decoding="async"
          width={1672}
          height={941}
        />
      </div>

      {/* Overlays are intentionally minimal to avoid visual noise. */}
      <div className="absolute top-4 left-4 right-4 sm:right-auto sm:w-80">
        <label className="block">
          <span className="sr-only">{m.searchPlaceholder}</span>
          <div className="flex items-center rounded-lg bg-white/95 backdrop-blur border border-white/80 px-3.5 py-2.5 shadow-sm">
            <svg
              aria-hidden="true"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="h-4 w-4 text-slate-400"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13 13l4 4m-2-9a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="search"
              placeholder={m.searchPlaceholder}
              className="ml-2 w-full bg-transparent text-sm text-navy-900 placeholder:text-slate-400 focus:outline-none"
              aria-label={m.searchPlaceholder}
            />
          </div>
        </label>
      </div>

      {/* Map controls — top-right overlay (decorative) */}
      <div
        className="absolute top-4 right-4 flex flex-col gap-1 rounded-md border border-slate-200 bg-white shadow-sm"
        aria-hidden="true"
      >
        <button
          type="button"
          tabIndex={-1}
          aria-label={m.zoomIn}
          className="flex h-7 w-7 items-center justify-center rounded-t text-slate-500 hover:bg-slate-50 hover:text-navy-900"
        >
          +
        </button>
        <button
          type="button"
          tabIndex={-1}
          aria-label={m.zoomOut}
          className="flex h-7 w-7 items-center justify-center border-t border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-navy-900"
        >
          −
        </button>
        <button
          type="button"
          tabIndex={-1}
          aria-label={m.reset}
          className="flex h-7 w-7 items-center justify-center rounded-b border-t border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-navy-900"
        >
          <svg
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
            className="h-3.5 w-3.5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 4h4v4M16 4h-4m0 12v-4M4 16h4"
            />
          </svg>
        </button>
      </div>

      {/* Area badge — bottom-right overlay */}
      <div className="absolute bottom-4 right-4 hidden sm:block">
        <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 shadow-sm">
          <svg
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
            className="h-4 w-4 text-emerald-600"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 17l6-6 4 4 4-4M3 7h4l3 3 4-4 3 3"
            />
          </svg>
          <div>
            <p className="text-xs font-semibold text-navy-900">
              {m.areaTitle}
            </p>
            <p className="text-[0.65rem] text-navy-500">
              428 {m.areaCountLabel}
            </p>
          </div>
        </div>
      </div>

      <figcaption className="absolute bottom-4 left-4 right-4 sm:right-auto sm:max-w-sm rounded-xl border border-white/80 bg-white/95 backdrop-blur p-5 shadow-sm">
        <p className="text-2xl font-bold text-navy-900 sm:text-3xl">2,842</p>
        <p className="text-sm text-navy-500">
          {m.summaryCard.totalLabel}
        </p>
        <ul className="mt-3 space-y-1.5 text-xs">
          {m.summaryCard.legend.map((item) => (
            <li key={item.label} className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className={cn("h-2.5 w-2.5 rounded-full", item.dotClass)}
              />
              <span className="flex-1 text-navy-700">{item.label}</span>
              <span className="font-medium text-navy-900">
                {item.count.toLocaleString("id-ID")}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-[0.8125rem] text-navy-400">
          {m.summaryCard.disclaimer}
        </p>
      </figcaption>
    </figure>
  );
}

function PillarsRow({ content }: { content: Content }) {
  const pillars = content.hero.pillars;
  return (
    <ul className="mt-12 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-x-10">
      {pillars.map((pillar) => {
        const Icon = PILLAR_ICONS[pillar.iconKey] ?? Database;
        return (
          <li key={pillar.label} className="flex flex-col">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <h3 className="mt-4 text-[0.95rem] font-semibold text-navy-900 sm:text-base">
              {pillar.label}
            </h3>
            <p className="mt-2 text-[0.95rem] leading-7 text-navy-600">
              {pillar.description}
            </p>
          </li>
        );
      })}
    </ul>
  );
}

const PILLAR_ICONS: Record<string, LucideIcon> = {
  database: Database,
  globe: Globe,
  map: MapIcon,
  code: Code2,
};