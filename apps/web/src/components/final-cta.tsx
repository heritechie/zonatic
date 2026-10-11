import Link from "next/link";
import type { Content } from "@/content";

/**
 * Final CTA section.
 *
 * Navy-900 background with topography pattern from /images/landing/topographic-pattern.webp.
 * Headline is left-aligned inside the max-w-7xl container.
 */
export function FinalCTA({ content }: { content: Content }) {
  const c = content.finalCta;
  return (
    <section
      id="get-started"
      aria-labelledby="final-cta-headline"
      className="relative overflow-hidden bg-navy-900 py-20 sm:py-28"
    >
      {/* Topography pattern background */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-5"
        style={{
          backgroundImage: "url('/images/landing/topographic-pattern.webp')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />

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
              href={content.meta.consoleUrl}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-white px-5 py-3 text-sm font-semibold text-navy-900 shadow-sm hover:bg-slate-50 transition-colors"
            >
              {c.primaryCta}
              <span aria-hidden="true">→</span>
            </Link>
            <Link
              href="#api-example"
              className="inline-flex items-center justify-center gap-2 rounded-md border border-emerald-300/60 bg-transparent px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700/60 transition-colors"
            >
              {c.secondaryCta}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}