import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { LOCALES, getContent, type Locale } from "@/content";
import { about } from "@/content/about";
import Link from "next/link";

/**
 * Pre-render one about page per locale at build time.
 */
export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const safeLocale = (LOCALES as readonly string[]).includes(locale)
    ? (locale as Locale)
    : ("id" as Locale);
  const content = getContent(safeLocale);
  const page = about[safeLocale];

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-navy-900 focus:shadow"
      >
        {content.common.skipToContent}
      </a>

      <Nav content={content} locale={safeLocale} />

      <main id="main">
        <section
          id="about"
          className="relative overflow-hidden bg-white pt-28 pb-16 sm:pt-36 sm:pb-20 lg:pt-40 lg:pb-24"
        >
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                {content.nav.brand}
              </p>
              <h1 className="mt-4 text-4xl font-bold tracking-tight text-navy-900 sm:text-5xl lg:text-6xl">
                {page.hero}
              </h1>
              <p className="mt-6 text-lg leading-8 text-navy-600 sm:text-xl">
                {page.description}
              </p>
            </div>

            <div className="mt-12 space-y-12 lg:mt-16 lg:space-y-16">
              {page.sections.map((section) => (
                <section key={section.title}>
                  <h2 className="text-2xl font-semibold tracking-tight text-navy-900 sm:text-3xl">
                    {section.title}
                  </h2>
                  {section.body && (
                    <p className="mt-4 max-w-3xl text-base leading-7 text-navy-600 sm:text-lg">
                      {section.body}
                    </p>
                  )}
                  {section.list && (
                    <ul className="mt-4 grid max-w-4xl gap-3 text-base leading-7 text-navy-600 sm:grid-cols-2">
                      {section.list.map((item) => (
                        <li
                          key={item}
                          className="flex items-start gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm"
                        >
                          <span
                            aria-hidden="true"
                            className="mt-1.5 h-1.5 w-1.5 rounded-full bg-emerald-600"
                          />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              ))}
            </div>

            <div className="mt-16 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
              <Link
                href={`/${safeLocale}/#get-started`}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald-600 px-6 py-3 text-[0.95rem] font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors"
              >
                {page.ctas.primary}
                <span aria-hidden="true">→</span>
              </Link>
              <Link
                href={`/${safeLocale}/#api`}
                className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-6 py-3 text-[0.95rem] font-semibold text-navy-800 hover:bg-slate-50 transition-colors"
              >
                {page.ctas.secondary}
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer content={content} locale={safeLocale} />
    </>
  );
}
