import type { Content } from "@/content";

/**
 * Location data section: "bring your data, put it on the map".
 *
 *   Left  | eyebrow, headline, supporting copy, then the reading order of
 *         | the visual as plain text (dataset -> enrichment -> result).
 *
 *   Right | one large horizontal illustration,
 *         | `/assets/zonatic_enrichment_section.webp`.
 *
 * This section used to be three stacked cards, each with its own screenshot,
 * which split one idea across three visuals and made the reader scroll past
 * two explanations before reaching the point. The single artwork already
 * shows dataset, process and result, so the page now adds only a caption
 * row — no cards, no per-step mockups.
 */
export function DataToIntelligence({ content }: { content: Content }) {
  const d = content.dataToIntel;

  return (
    <section
      id="data"
      aria-labelledby="data-headline"
      className="bg-slate-50 py-20 sm:py-24 lg:py-28"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-14">
          {/* Left column — copy */}
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
              {d.eyebrow}
            </p>
            <h2
              id="data-headline"
              className="mt-4 text-3xl font-bold tracking-tight text-navy-900 sm:text-4xl lg:text-[2.75rem] lg:leading-[1.1]"
            >
              {d.headline}{" "}
              <span className="text-emerald-700">{d.headlineHighlight}</span>
            </h2>
            <p className="mt-5 text-[0.95rem] leading-7 text-navy-600 sm:text-lg">
              {d.description}
            </p>

            <FlowLabels labels={d.flowLabels} />
          </div>

          {/* Right column — the single main visual */}
          <figure className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/assets/zonatic_enrichment_section.webp"
              alt={d.imageAlt}
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

/**
 * Reading order of the illustration. Arrows only — no boxes — so it reads as
 * a caption rather than as three more cards competing with the visual.
 */
function FlowLabels({ labels }: { labels: string[] }) {
  return (
    <ol className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-2 text-[0.8125rem] font-medium text-navy-500">
      {labels.map((label, i) => (
        <li key={label} className="flex items-center gap-3">
          <span className="text-emerald-700">{label}</span>
          {i < labels.length - 1 ? (
            <span aria-hidden="true" className="text-slate-300">
              &rarr;
            </span>
          ) : null}
        </li>
      ))}
    </ol>
  );
}