import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Content } from "@/content";

/**
 * Hero: navy background with Indonesia map, left copy + CTAs, right map visual.
 *
 * Structure:
 *   - Navy background with Indonesia map illustration
 *   - Left: eyebrow, headline (emerald accent), description, primary + secondary CTA, stats row
 *   - Right: Indonesia map visual
 *
 * Split is 50/50 on lg+ with the map on the right.
 */
export function Hero({ content }: { content: Content }) {
  const h = content.hero;

  return (
    <section
      id="hero"
      className="relative overflow-hidden bg-navy-900 text-white pt-32 pb-16 sm:pt-40 sm:pb-20 lg:pt-44 lg:pb-24"
      aria-labelledby="hero-headline"
    >
      {/* Topographic pattern background */}
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

      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-[0.42fr_0.58fr] lg:gap-8 xl:gap-12">
          {/* Left column — copy + CTAs */}
          <div className="max-w-xl lg:max-w-none">
            <p className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700 bg-white/10 text-emerald-300 border-emerald-800">
              <span
                aria-hidden="true"
                className="h-1.5 w-1.5 rounded-full bg-emerald-500"
              />
              {h.eyebrow}
            </p>

            <h1
              id="hero-headline"
              className="mt-6 text-4xl font-bold leading-[1.08] tracking-tight text-white sm:text-[2.5rem] lg:text-[3rem]"
            >
              {h.headline}{" "}
              <span className="text-emerald-400">{h.headlineHighlight}</span>
            </h1>

            <p className="mt-6 text-lg leading-8 text-slate-300 sm:text-xl">
              {h.description}
            </p>

            <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
              <Link
                href={content.meta.consoleUrl}
                className="group inline-flex items-center justify-center gap-2 rounded-md bg-emerald-600 px-6 py-3 text-[0.95rem] font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
              >
                {h.primaryCta}
                <ArrowRight
                  className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </Link>
              <Link
                href="#data-sources"
                className="inline-flex items-center justify-center rounded-md border border-emerald-300/60 bg-transparent px-6 py-3 text-[0.95rem] font-semibold text-white hover:bg-emerald-700/60 transition-colors"
              >
                {h.secondaryCta}
              </Link>
            </div>

            {/* Stats row */}
            <div className="mt-12 grid grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-4">
              {h.stats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <p className="text-3xl font-bold text-emerald-400 sm:text-4xl lg:text-5xl">
                    {stat.value}
                  </p>
                  <p className="mt-1 text-sm text-slate-400 uppercase tracking-wide">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Right column — Indonesia map visual */}
          <div className="relative">
            <div
              className="relative"
              style={{
                // Horizontal fade: transparent at edges, opaque in middle
                WebkitMaskImage: `
                  linear-gradient(
                    to right,
                    transparent 0%,
                    black 15%,
                    black 85%,
                    transparent 100%
                  ),
                  linear-gradient(
                    to bottom,
                    transparent 0%,
                    black 10%,
                    black 90%,
                    transparent 100%
                  )
                `,
                maskImage: `
                  linear-gradient(
                    to right,
                    transparent 0%,
                    black 15%,
                    black 85%,
                    transparent 100%
                  ),
                  linear-gradient(
                    to bottom,
                    transparent 0%,
                    black 10%,
                    black 90%,
                    transparent 100%
                  )
                `,
                WebkitMaskComposite: "source-in",
                maskComposite: "intersect",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/landing/hero-indonesia-map.webp"
                alt={h.imageAlt}
                className="h-auto w-full max-w-none select-none"
                loading="eager"
                decoding="async"
                width={1672}
                height={941}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}