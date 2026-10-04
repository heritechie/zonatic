import Link from "next/link";
import type { Content } from "@/content";

/**
 * Final CTA section.
 *
 * Emerald-800 background with the Indonesia outline
 * (`/assets/maps/indonesia-contour.webp`) blended into the background as a
 * watermark on the right. Headline is left-aligned inside the max-w-7xl
 * container; on lg+ the section gains extra vertical padding so the buttons
 * sit comfortably above the footer.
 *
 * Section height is unchanged by the artwork: the decoration is absolutely
 * positioned and clipped by an `overflow-hidden` wrapper, so it can neither
 * grow the section nor push the content around.
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
              href={content.meta.consoleUrl}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-white px-5 py-3 text-sm font-semibold text-emerald-800 shadow-sm hover:bg-slate-50 transition-colors"
            >
              {c.primaryCta}
              <span aria-hidden="true">→</span>
            </Link>
            <Link
              href="#api"
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

/**
 * Decorative Indonesia outline blended into the emerald background.
 *
 * A single `<img>` sized by width, with its height derived from the asset's
 * 2:1 ratio and `object-fit: contain`, so the silhouette is never cropped.
 * Geometry, opacity, and offsets all live in CSS variables on `.zonatic-map`
 * (globals.css) rather than in class strings here.
 *
 * Sizing is deliberate rather than incidental: the archipelago fills nearly the
 * whole 2400x1200 canvas, so a box wider than the section, or a
 * centre-anchored box taller than the section, clips it. At `--map-width: 48%`
 * the box is 691x346 at 1440px and clears the section vertically. The section
 * keeps its existing height — the artwork never drives layout, and the wrapper
 * is `overflow-hidden` so the small right bleed cannot widen the document.
 *
 * `mix-blend-mode: screen` is what keeps the artwork's dark panel invisible
 * against the green; see `.zonatic-map` for the full reasoning.
 */
function IndonesiaBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/assets/maps/indonesia-contour.webp"
        alt=""
        aria-hidden="true"
        className="zonatic-map"
        loading="lazy"
        decoding="async"
        width={2400}
        height={1200}
      />
    </div>
  );
}