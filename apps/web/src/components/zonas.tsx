import type { Content } from "@/content";

/**
 * Zonas: administrative areas and custom polygons combined into one
 * reusable business unit.
 *
 *   Left  | eyebrow, headline, copy, then three capability lines.
 *         | Rendered as a plain list with a small emerald marker: the
 *         | previous version turned each capability into its own card
 *         | with its own screenshot, which made one idea look like three
 *         | products.
 *
 *   Right | one large horizontal illustration,
 *         | `/assets/zonatic_zona_editor.webp`.
 *
 * Terminology note: the product term is "zona", never "territory".
 */
export function Zonas({ content }: { content: Content }) {
  const z = content.zonas;

  return (
    <section
      id="zonas"
      aria-labelledby="zonas-headline"
      className="bg-white py-20 sm:py-24 lg:py-28"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-14">
          {/* Left column — copy + capability lines */}
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
              {z.eyebrow}
            </p>
            <h2
              id="zonas-headline"
              className="mt-4 text-3xl font-bold tracking-tight text-navy-900 sm:text-4xl lg:text-[2.75rem] lg:leading-[1.1]"
            >
              {z.headline}
            </h2>
            <p className="mt-5 text-[0.95rem] leading-7 text-navy-600 sm:text-lg">
              {z.description}
            </p>

            <ul className="mt-9 space-y-6">
              {z.capabilities.map((capability) => (
                <li key={capability.label} className="flex gap-4">
                  <span
                    aria-hidden="true"
                    className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600"
                  />
                  <div>
                    <h3 className="text-[0.95rem] font-semibold text-navy-900 sm:text-base">
                      {capability.label}
                    </h3>
                    <p className="mt-1 text-[0.95rem] leading-7 text-navy-600">
                      {capability.description}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Right column — the single main visual */}
          <figure className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/assets/zonatic_zona_editor.webp"
              alt={z.imageAlt}
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