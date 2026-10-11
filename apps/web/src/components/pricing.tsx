import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import type { Content } from "@/content";

/**
 * Pricing & Billing section.
 *
 * Menampilkan model pembayaran prepaid Zonatic dengan dua kategori harga
 * (Reverse Geocoding & API Utilitas) dalam rupiah, kuota gratis bulanan,
 * dan tiga keunggulan utama. CTA tunggal mengarah ke dokumentasi.
 */
export function Pricing({ content }: { content: Content }) {
  const p = content.pricing;

  return (
    <section
      id="pricing"
      aria-labelledby="pricing-headline"
      className="bg-white py-20 sm:py-24 lg:py-28"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
            {p.eyebrow}
          </p>
          <h2
            id="pricing-headline"
            className="mt-4 text-3xl font-bold tracking-tight text-navy-900 sm:text-4xl lg:text-[2.75rem] lg:leading-[1.1]"
          >
            {p.headline}
          </h2>
          <p className="mt-5 text-[0.95rem] leading-7 text-navy-600 sm:text-lg">
            {p.description}
          </p>
        </div>

        <div className="mt-10 rounded-xl border border-emerald-100 bg-emerald-50/40 px-6 py-5 text-center">
          <p className="text-sm font-semibold text-emerald-800">
            {p.freeQuotaTitle}
          </p>
          <p className="mt-1 text-xs text-navy-600">
            {p.freeQuotaDescription}
          </p>
        </div>

        <ul className="mt-10 grid gap-6 sm:grid-cols-2">
          {p.tiers.map((tier) => (
            <li
              key={tier.name}
              className="flex flex-col rounded-xl border border-slate-200 bg-white p-6 transition-shadow hover:shadow-sm"
            >
              <h3 className="text-[1.1rem] font-semibold text-navy-900">
                {tier.name}
              </h3>
              <p className="mt-4 text-xl font-bold tracking-tight text-navy-900 sm:text-2xl">
                {tier.priceLabel}
              </p>
              <p className="mt-1 text-xs font-medium text-navy-500 sm:text-sm">
                {tier.priceNote}
              </p>
              <p className="mt-4 text-[0.95rem] leading-7 text-navy-600">
                {tier.description}
              </p>
            </li>
          ))}
        </ul>

        <p className="mt-6 text-center text-sm text-navy-500">
          {p.volumeNote}
        </p>

        <div className="mt-14">
          <h3 className="text-center text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
            Keunggulan
          </h3>
          <ul className="mt-6 grid gap-6 sm:grid-cols-3">
            {p.advantages.map((adv) => (
              <li
                key={adv.title}
                className="rounded-lg border border-slate-200 bg-white p-5"
              >
                <h4 className="text-[0.95rem] font-semibold text-navy-900">
                  {adv.title}
                </h4>
                <p className="mt-2 text-sm leading-6 text-navy-600">
                  {adv.description}
                </p>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-12 flex flex-col items-center justify-center">
          <Link
            href={p.ctaHref}
            className="group inline-flex items-center justify-center gap-2 rounded-md bg-emerald-600 px-6 py-3 text-[0.95rem] font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
          >
            <BookOpen className="h-4 w-4" aria-hidden="true" />
            {p.cta}
            <ArrowRight
              className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </Link>
        </div>
      </div>
    </section>
  );
}