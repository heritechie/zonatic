import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";
import type { Content } from "@/content";

/**
 * Two-column territory section.
 *
 *   Left   | eyebrow, headline, description.
 *
 *   Right  | three cards stacked vertically (mobile) or
 *          arranged in a 1×3 row (desktop). Each card shows the
 *          brand-approved asset when available, otherwise falls
 *          back to an inline-SVG mock.
 */
export function Territories({ content }: { content: Content }) {
  const t = content.territories;
  return (
    <section
      id="territories"
      aria-labelledby="territories-headline"
      className="bg-white py-20 sm:py-28"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-start lg:gap-14">
          {/* Left column — copy */}
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
              {t.eyebrow}
            </p>
            <h2
              id="territories-headline"
              className="mt-4 text-3xl font-bold tracking-tight text-navy-900 sm:text-4xl lg:text-5xl"
            >
              {t.headline}
            </h2>
            <p className="mt-5 text-[0.95rem] leading-7 text-navy-600 sm:text-lg">
              {t.description}
            </p>
          </div>

          {/* Right column — three cards stacked vertically */}
          <div className="flex flex-col gap-6">
            {t.cards.map((card, i) => (
              <CapabilityCard
                key={card.title}
                title={card.title}
                description={card.description}
                helper={t.cardHelpers[i]}
              >
                <CapabilityMock
                  index={i}
                  content={content}
                  areaName={t.summary.areaName}
                />
              </CapabilityCard>
            ))}
          </div>
        </div>

        <div className="mt-12 text-center">
          <Link
            href="#get-started"
            className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors"
          >
            {t.createCta}
            <span aria-hidden="true">→</span>
          </Link>
          <p className="mt-3 text-xs text-navy-500">{t.ctaFootnote}</p>
        </div>
      </div>
    </section>
  );
}

function CapabilityCard({
  title,
  description,
  helper,
  children,
}: {
  icon?: LucideIcon;
  title: string;
  description: string;
  helper?: string;
  children: React.ReactNode;
}) {
  return (
    <article className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
      <h3 className="text-lg font-semibold text-navy-900">{title}</h3>
      <p className="mt-1.5 text-[0.95rem] leading-7 text-navy-600">
        {description}
      </p>
      {helper ? (
        <p className="mt-2 text-[0.8125rem] font-medium uppercase tracking-wider text-emerald-700">
          {helper}
        </p>
      ) : null}
      <div className="mt-5">{children}</div>
    </article>
  );
}

function CapabilityMock({
  index,
  content,
}: {
  index: number;
  content: Content;
  areaName: string;
}) {
  if (index === 0) return <AdminTree content={content} />;
  if (index === 1) return <PolygonImage alt={content.hero.eyebrow} />;
  return <TerritorySummaryImage alt={content.hero.eyebrow} />;
}

function AdminTree({ content }: { content: Content }) {
  const tree = content.territories.adminTree;
  return (
    <ul
      className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-sm"
      aria-label={tree.label}
    >
      <li className="flex items-center justify-between text-navy-900">
        <span className="font-semibold">{tree.label}</span>
        <ChevronRight className="h-3 w-3 rotate-90 text-slate-400" aria-hidden="true" />
      </li>
      <li className="mt-2 ml-2 text-navy-700">{tree.children.label}</li>
      <ul className="mt-1.5 ml-4 space-y-1">
        {tree.children.grandchildren.map((name) => (
          <li
            key={name}
            className="flex items-center gap-1.5 text-navy-600"
          >
            <span
              aria-hidden="true"
              className="inline-flex h-2.5 w-2.5 items-center justify-center rounded border border-slate-300"
            />
            <span>{name}</span>
          </li>
        ))}
      </ul>
    </ul>
  );
}

function PolygonImage({ alt }: { alt: string }) {
  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-slate-200 bg-white">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/assets/territory/territory-polygon.webp"
        alt={alt}
        className="w-full h-auto object-contain"
        loading="lazy"
        decoding="async"
        width={1200}
        height={800}
      />
    </div>
  );
}

/**
 * Territory summary card visual (the third capability card).
 * Uses the brand-approved asset when present; otherwise falls back
 * to an inline mock that approximates the same look.
 */
function TerritorySummaryImage({ alt }: { alt: string }) {
  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-slate-200 bg-white">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/assets/territory/territory-summary.webp"
        alt={alt}
        className="w-full h-auto object-contain"
        loading="lazy"
        decoding="async"
        width={1400}
        height={900}
      />
    </div>
  );
}