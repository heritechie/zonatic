import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { LOCALES, getContent, type Locale } from "@/content";
import { terms } from "@/content/terms";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const safeLocale = (LOCALES as readonly string[]).includes(locale)
    ? (locale as Locale)
    : ("id" as Locale);
  const content = getContent(safeLocale);
  const page = terms[safeLocale];

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
        <section className="bg-white pt-28 pb-16 sm:pt-36 sm:pb-20 lg:pt-40 lg:pb-24">
          <div className="mx-auto max-w-3xl px-6 lg:max-w-[820px] lg:px-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                {content.nav.brand}
              </p>
              <h1 className="mt-4 text-3xl font-bold tracking-tight text-navy-900 sm:text-4xl lg:text-5xl">
                {page.title}
              </h1>
              <p className="mt-3 text-sm text-navy-500">
                {page.lastUpdatedLabel}: {page.lastUpdated}
              </p>
            </div>

            <article className="mt-10 space-y-10">
              {page.sections.map((section) => (
                <section key={section.title}>
                  <h2 className="text-xl font-semibold tracking-tight text-navy-900 sm:text-2xl">
                    {section.title}
                  </h2>
                  {section.body && (
                    <p className="mt-3 leading-7 text-navy-700">
                      {section.body}
                    </p>
                  )}
                  {section.list && (
                    <ul className="mt-3 list-disc space-y-2 pl-6 text-navy-700">
                      {section.list.map((item) => (
                        <li key={item} className="leading-7">
                          {item}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              ))}
            </article>

            <div className="mt-12 rounded-lg border border-slate-200 bg-slate-50 p-6 text-sm text-navy-600">
              <h3 className="text-base font-semibold text-navy-900">
                {page.contact.title}
              </h3>
              <p className="mt-2 leading-6">{page.contact.body}</p>
              <ul className="mt-3 space-y-1 text-navy-600">
                <li>{page.placeholders.entity}</li>
                <li>{page.placeholders.jurisdiction}</li>
                <li>{page.placeholders.email}</li>
              </ul>
            </div>
          </div>
        </section>
      </main>

      <Footer content={content} locale={safeLocale} />
    </>
  );
}
