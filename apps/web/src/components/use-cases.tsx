import { Coins, Store, Target, Truck, type LucideIcon } from "lucide-react";
import type { Content } from "@/content";

const ICONS: Record<string, LucideIcon> = {
  coins: Coins,
  store: Store,
  truck: Truck,
  target: Target,
};

/**
 * Four use-case cards in a single row on lg.
 *
 * Reduced from six to four and from a 3-column grid to 4 columns: the
 * section is context for the product story above it, not a catalogue, so it
 * should be scannable in one line and no longer than the sections it
 * follows.
 *
 * Use-case cards describe examples of how customers may apply
 * Zonatic — they are NOT Zonatic's product scope.
 */
export function UseCases({ content }: { content: Content }) {
  const u = content.useCases;
  return (
    <section
      id="use-cases"
      aria-labelledby="use-cases-headline"
      className="bg-white py-20 sm:py-24 lg:py-28"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
            {u.eyebrow}
          </p>
          <h2
            id="use-cases-headline"
            className="mt-4 text-3xl font-bold tracking-tight text-navy-900 sm:text-4xl lg:text-5xl"
          >
            {u.headline}
          </h2>
          <p className="mt-5 text-base leading-7 text-navy-600 sm:text-lg">
            {u.description}
          </p>
        </div>

        <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {u.cases.map((useCase) => {
            const Icon = ICONS[useCase.iconKey] ?? Coins;
            return (
              <li
                key={useCase.title}
                className="rounded-xl border border-slate-200 bg-white p-6 transition-shadow hover:shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-emerald-50 text-emerald-700"
                  >
                    <Icon className="h-[1.1rem] w-[1.1rem]" aria-hidden="true" />
                  </span>
                  <h3 className="text-[0.95rem] font-semibold text-navy-900 sm:text-base">
                    {useCase.title}
                  </h3>
                </div>
                <p className="mt-3 text-[0.95rem] leading-7 text-navy-600">
                  {useCase.description}
                </p>
              </li>
            );
          })}
        </ul>

        <p className="mt-10 text-center text-[0.8125rem] text-navy-400">
          {u.disclaimer}
        </p>
      </div>
    </section>
  );
}