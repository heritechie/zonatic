import type { Content } from "@/content";

/**
 * Features section: four key feature cards.
 *
 * Four cards in a row showing the four key features:
 * - Administrative Boundary Data
 * - Indonesian Postal Codes
 * - Reverse Geocoding
 * - Developer Friendly
 */
export function Features({ content }: { content: Content }) {
  const f = content.features;

  return (
    <section
      id="features"
      aria-labelledby="features-headline"
      className="bg-white py-20 sm:py-24 lg:py-28"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
            {f.eyebrow}
          </p>
          <h2
            id="features-headline"
            className="mt-4 text-3xl font-bold tracking-tight text-navy-900 sm:text-4xl lg:text-[2.75rem] lg:leading-[1.1]"
          >
            {f.headline}
          </h2>
          <p className="mt-5 text-[0.95rem] leading-7 text-navy-600 sm:text-lg">
            {f.description}
          </p>
        </div>

        <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {f.features.map((feature) => (
            <li
              key={feature.title}
              className="rounded-xl border border-slate-200 bg-white p-6 transition-shadow hover:shadow-sm"
            >
              <div className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-emerald-50 text-emerald-700"
                >
                  <svg className="h-5 w-5 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    {feature.iconKey === "map" && (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2h14a2 2 0 002-2v-5M12 7v5l3 3" />
                    )}
                    {feature.iconKey === "mail" && (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    )}
                    {feature.iconKey === "navigation" && (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0112 21c-2.505 0-4.86-.867-6.818-2.58" />
                    )}
                    {feature.iconKey === "code" && (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l4 4m0 0l4-4m-4 4H2" />
                    )}
                  </svg>
                </span>
                <h3 className="text-[0.95rem] font-semibold text-navy-900 sm:text-base">
                  {feature.title}
                </h3>
              </div>
              <p className="mt-3 text-[0.95rem] leading-7 text-navy-600">
                {feature.description}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}