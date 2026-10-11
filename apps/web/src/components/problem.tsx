import type { Content } from "@/content";

/**
 * Problem section: explains the pain point Zonatic solves.
 *
 * Left: eyebrow, headline, description
 * Right: visual showing the relationship between coordinates, administrative boundaries, and postal codes
 */
export function Problem({ content }: { content: Content }) {
  const p = content.problem;

  return (
    <section
      id="problem"
      aria-labelledby="problem-headline"
      className="bg-white py-20 sm:py-24 lg:py-28"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
          {/* Left column — copy */}
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
              {p.eyebrow}
            </p>
            <h2
              id="problem-headline"
              className="mt-4 text-3xl font-bold tracking-tight text-navy-900 sm:text-4xl lg:text-[2.75rem] lg:leading-[1.1]"
            >
              {p.headline}
            </h2>
            <p className="mt-5 text-[0.95rem] leading-7 text-navy-600 sm:text-lg">
              {p.description}
            </p>
          </div>

          {/* Right column — visual */}
          <figure className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/landing/location-data-flow.webp"
              alt={p.imageAlt}
              className="h-auto w-full select-none"
              loading="lazy"
              decoding="async"
              width={1774}
              height={887}
            />
          </figure>
        </div>
      </div>
    </section>
  );
}