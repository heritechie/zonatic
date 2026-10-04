import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Content } from "@/content";

/**
 * Hero: copy on the left, one large flat illustration on the right.
 *
 *   Left  | eyebrow, headline (emerald accent on the closing phrase),
 *         | supporting copy, primary + secondary CTA, then a
 *         | plain-text micro-row restating the product shape:
 *         | data -> zona -> rules/API.
 *
 *   Right | `/assets/zonatic_hero_flat_green.webp`, the page's primary
 *         | visual. No cards, badges or inputs float on top of it: the
 *         | artwork already carries its own labels, and overlaying
 *         | would duplicate them and compete with the headline.
 *
 * Split is 45/55 on lg+ so the illustration anchors the right half without
 * outweighing the copy. On lg the artwork is allowed to bleed past the
 * container padding (`-mr-*`) and grow slightly taller than the text column,
 * which keeps the section from reading as two rigid boxes.
 */
export function Hero({ content }: { content: Content }) {
  const h = content.hero;

  return (
    <section
      id="hero"
      className="relative overflow-hidden bg-white pt-32 pb-16 sm:pt-40 sm:pb-20 lg:pt-44 lg:pb-24"
      aria-labelledby="hero-headline"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-[45fr_55fr] lg:gap-8 xl:gap-12">
          {/* Left column — copy + CTAs */}
          <div className="max-w-xl lg:max-w-none">
            <p className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
              <span
                aria-hidden="true"
                className="h-1.5 w-1.5 rounded-full bg-emerald-500"
              />
              {h.eyebrow}
            </p>

            <h1
              id="hero-headline"
              className="mt-6 text-4xl font-bold leading-[1.08] tracking-tight text-navy-900 sm:text-[2.5rem] lg:text-[2.75rem]"
            >
              {h.headline}{" "}
              <span className="text-emerald-700">{h.headlineHighlight}</span>
            </h1>

            <p className="mt-6 text-lg leading-8 text-navy-600 sm:text-xl">
              {h.description}
            </p>

            <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
              <Link
                href="#get-started"
                className="group inline-flex items-center justify-center gap-2 rounded-md bg-emerald-600 px-6 py-3 text-[0.95rem] font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
              >
                {h.primaryCta}
                <ArrowRight
                  className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </Link>
              <Link
                href="#api"
                className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-6 py-3 text-[0.95rem] font-semibold text-navy-800 transition-colors hover:bg-slate-50"
              >
                {h.secondaryCta}
              </Link>
            </div>

            <MicroRow items={h.microRow} />
          </div>

          {/* Right column — the hero illustration.
              Allowed to run past the container's right padding and to grow
              a little taller than the copy column; the section clips it, so
              the bleed can never create horizontal overflow. */}
          <div className="lg:-mr-10 xl:-mr-20">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/assets/zonatic_hero_flat_green.webp"
              alt={h.imageAlt}
              className="h-auto w-full select-none"
              loading="eager"
              decoding="async"
              width={1672}
              height={941}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Three capability markers under the CTAs.
 *
 * Deliberately not cards: no border, no background, no icons. They restate
 * the product shape in one line so the fold still explains what Zonatic is
 * without adding three more boxes to the page.
 */
function MicroRow({ items }: { items: string[] }) {
  return (
    <ul className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-slate-200 pt-6">
      {items.map((item, i) => (
        <li key={item} className="flex items-center gap-6">
          <span className="flex items-center gap-2 text-[0.8125rem] font-medium text-navy-600">
            <span
              aria-hidden="true"
              className="h-1 w-1 rounded-full bg-emerald-600"
            />
            {item}
          </span>
          {i < items.length - 1 ? (
            <span
              aria-hidden="true"
              className="hidden h-3 w-px bg-slate-200 sm:block"
            />
          ) : null}
        </li>
      ))}
    </ul>
  );
}