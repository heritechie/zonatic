import {
  Coins,
  Store,
  Wrench,
  ShieldCheck,
  ShoppingBasket,
  Truck,
  type LucideIcon,
} from "lucide-react";
import type { Content } from "@/content";

const ICONS: Record<string, LucideIcon> = {
  coins: Coins,
  store: Store,
  wrench: Wrench,
  "shield-check": ShieldCheck,
  "shopping-basket": ShoppingBasket,
  truck: Truck,
};

/**
 * Six use-case cards. Two-row × three-column compact grid so each
 * card stays short and the section reads as one band.
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
      className="bg-white py-20 sm:py-28"
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

        <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
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