import Link from "next/link";
import { Mail } from "lucide-react";
import type { Content } from "@/content";

/**
 * Final CTA section.
 *
 * Emerald-800 background with a faint Indonesia outline
 * (`/assets/maps/indonesia-contour.webp`) at low opacity. Headline
 * is left-aligned inside the max-w-7xl container; on lg+ the
 * section gains extra vertical padding so the buttons sit
 * comfortably above the footer.
 */
export function FinalCTA({ content }: { content: Content }) {
  const c = content.finalCta;
  return (
    <section
      id="get-started"
      aria-labelledby="final-cta-headline"
      className="relative overflow-hidden bg-emerald-800 py-20 sm:py-28"
    >
      <IndonesiaBackground />

      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200">
            {c.eyebrow}
          </p>
          <h2
            id="final-cta-headline"
            className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl"
          >
            {c.headline}
          </h2>
          <p className="mt-5 text-[0.95rem] leading-7 text-emerald-50/95 sm:text-lg">
            {c.description}
          </p>
          <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row">
            <Link
              href="/sign-up"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-white px-5 py-3 text-sm font-semibold text-emerald-800 shadow-sm hover:bg-slate-50 transition-colors"
            >
              {c.primaryCta}
              <span aria-hidden="true">→</span>
            </Link>
            <Link
              href="mailto:hello@zonatic.id"
              className="inline-flex items-center justify-center gap-2 rounded-md border border-emerald-300/60 bg-transparent px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700/60 transition-colors"
            >
              <Mail className="h-4 w-4" aria-hidden="true" />
              {c.secondaryCta}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Decorative Indonesia outline placed on the emerald background.
 * Uses the brand-approved asset at low opacity so it reads as a
 * watermark rather than a primary visual.
 */
function IndonesiaBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-0 overflow-hidden"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/assets/maps/indonesia-contour.webp"
        alt=""
        aria-hidden="true"
        className="absolute right-[-4%] top-1/2 hidden h-[130%] w-auto -translate-y-1/2 translate-x-0 opacity-90 mix-blend-screen lg:block xl:right-[-6%]"
        loading="lazy"
        decoding="async"
        width={2400}
        height={1200}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-emerald-800 via-emerald-800/92 to-emerald-800/60 lg:bg-gradient-to-r lg:from-emerald-800 lg:via-emerald-800/88 lg:to-emerald-800/20" />
    </div>
  );
}