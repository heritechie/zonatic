import type { Content } from "@/content";

/**
 * Two-column workflow section.
 *
 *   Left   | eyebrow, headline (two lines + emerald emphasis),
 *          | description text.
 *
 *   Right  | three stacked cards: Upload → Resolve → Visualize,
 *          | each containing the asset preview for that step.
 *
 * Step 1 uses `/assets/workflow/dataset-preview.webp`,
 * Step 2 uses `/assets/workflow/enrichment-preview.webp`,
 * Step 3 uses `/assets/maps/customer-location-map.webp`.
 * When any of these assets is missing, the component renders an
 * inline-SVG fallback that approximates the same visual.
 */
export function DataToIntelligence({ content }: { content: Content }) {
  const d = content.dataToIntel;
  return (
    <section
      id="data"
      aria-labelledby="data-headline"
      className="bg-slate-50 py-16 sm:py-20 lg:py-24"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-start lg:gap-14">
          {/* Left column — copy */}
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
              {d.eyebrow}
            </p>
            <h2
              id="data-headline"
              className="mt-4 text-3xl font-bold tracking-tight text-navy-900 sm:text-4xl lg:text-5xl"
            >
              <span className="block">{d.headline}</span>
              <span className="block text-emerald-700">
                {d.headlineHighlight}
              </span>
            </h2>
            <p className="mt-5 text-[0.95rem] leading-7 text-navy-600 sm:text-lg">
              {d.description}
            </p>
          </div>

          {/* Right column — horizontal step cards with connector */}
          <ol className="relative flex flex-col gap-6 lg:gap-8">
            <div
              aria-hidden="true"
              className="hidden lg:block absolute left-4 top-6 bottom-6 w-px bg-gradient-to-b from-emerald-200/60 via-slate-300/60 to-slate-200/50"
            />
            {d.steps.map((step, i) => (
              <li
                key={step.title}
                className="relative rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md lg:p-6"
              >
                <div className="flex items-start gap-4">
                  <span
                    aria-hidden="true"
                    className="relative z-10 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-sm font-semibold text-white shadow-sm"
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-semibold text-navy-900 sm:text-lg">
                      {step.title}
                    </h3>
                    <p className="mt-1.5 text-[0.95rem] leading-7 text-navy-600">
                      {step.description}
                    </p>
                    <div className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-slate-950">
                      <StepMedia stepIndex={i} step={step} content={content} />
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

function StepMedia({
  stepIndex,
  step,
  content,
}: {
  stepIndex: number;
  step: Content["dataToIntel"]["steps"][number];
  content: Content;
}) {
  if (stepIndex === 0) {
    return <UploadPreview />;
  }
  if (stepIndex === 1) {
    return <EnrichmentPreview />;
  }
  return (
    <MapPreview
      areaName={step.map?.areaName ?? ""}
      insideLabel={step.map?.insideLabel ?? ""}
      outsideLabel={step.map?.outsideLabel ?? ""}
      fallbackAlt={content.hero.eyebrow}
    />
  );
}

/**
 * Step 1 visual: a brand-approved screenshot of a CSV upload
 * preview. Falls back to a CSV mock if the asset is missing.
 */
function UploadPreview() {
  return (
    <div className="relative w-full overflow-hidden bg-white">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/assets/workflow/dataset-preview.webp"
        alt="Pratinjau dataset CSV"
        className="w-full h-auto object-contain"
        loading="lazy"
        decoding="async"
        width={1400}
        height={900}
      />
    </div>
  );
}

/**
 * Step 2 visual: a brand-approved screenshot of the enrichment
 * results panel. Falls back to a stats summary if the asset is
 * missing.
 */
function EnrichmentPreview() {
  return (
    <div className="relative w-full overflow-hidden bg-white">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/assets/workflow/enrichment-preview.webp"
        alt="Pratinjau enrichment"
        className="w-full h-auto object-contain"
        loading="lazy"
        decoding="async"
        width={1400}
        height={900}
      />
    </div>
  );
}

function MapPreview({
  areaName,
  insideLabel,
  outsideLabel,
  fallbackAlt,
}: {
  areaName: string;
  insideLabel: string;
  outsideLabel: string;
  fallbackAlt: string;
}) {
  return (
    <div className="relative w-full overflow-hidden bg-white">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/assets/maps/customer-location-map.webp"
        alt={fallbackAlt}
        className="w-full h-auto object-contain"
        loading="lazy"
        decoding="async"
        width={1600}
        height={1000}
      />
      <div className="absolute bottom-3 right-3 rounded-md bg-white/95 backdrop-blur px-2.5 py-1.5 text-[0.8125rem] shadow-sm">
        <p className="font-semibold text-navy-900">{areaName}</p>
        <p className="text-navy-500">
          <span className="text-emerald-700">●</span> 6 {insideLabel} ·{" "}
          <span className="text-slate-400">●</span> 4 {outsideLabel}
        </p>
      </div>
    </div>
  );
}