import type { Content } from "@/content";

/**
 * Data Sources section: three trusted sources.
 *
 * Three cards in a row showing the three data sources:
 * - Administrative Boundary Data (Kemendagri)
 * - Indonesian Postal Code Data (Pos Indonesia)
 * - Geographic Information (BIG)
 */
export function DataSources({ content }: { content: Content }) {
  const d = content.dataSources;

  return (
    <section
      id="data-sources"
      aria-labelledby="data-sources-headline"
      className="bg-slate-50 py-20 sm:py-24 lg:py-28"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
            {d.eyebrow}
          </p>
          <h2
            id="data-sources-headline"
            className="mt-4 text-3xl font-bold tracking-tight text-navy-900 sm:text-4xl lg:text-[2.75rem] lg:leading-[1.1]"
          >
            {d.headline}
          </h2>
          <p className="mt-5 text-[0.95rem] leading-7 text-navy-600 sm:text-lg">
            {d.description}
          </p>
        </div>

        <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {d.sources.map((source) => (
            <li
              key={source.title}
              className="rounded-xl border border-slate-200 bg-white p-6 transition-shadow hover:shadow-sm"
            >
              <div className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-white"
                >
                  {/* Source logo/image */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={
                      source.title.includes("Wilayah")
                        ? "/images/landing/sources/kemendagri-transparent.webp"
                        : source.title.includes("Pos")
                        ? "/images/landing/sources/pos-indonesia-transparent.webp"
                        : "/images/landing/sources/big-logo-transparent.webp"
                    }
                    alt=""
                    className="h-8 w-auto max-h-8 max-w-[80%] object-contain"
                    aria-hidden="true"
                  />
                </span>
                <h3 className="text-base font-semibold text-navy-900">
                  {source.title}
                </h3>
              </div>
              <p className="mt-3 text-[0.95rem] leading-7 text-navy-600">
                {source.description}
              </p>
              {source.verified && (
                <div className="mt-4 flex items-center gap-2 text-xs font-medium text-emerald-700">
                  <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 12.586 7.707 11.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Sumber terverifikasi</span>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}