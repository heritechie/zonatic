import { Nav } from "@/components/nav";
import { Hero } from "@/components/hero";
import { DataToIntelligence } from "@/components/data-to-intel";
import { Territories } from "@/components/territories";
import { ApiSection } from "@/components/api-section";
import { UseCases } from "@/components/use-cases";
import { FinalCTA } from "@/components/final-cta";
import { Footer } from "@/components/footer";
import { LOCALES, getContent, type Locale } from "@/content";

/**
 * Pre-render one page per locale at build time.
 */
export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export default async function LocalePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const safeLocale = (LOCALES as readonly string[]).includes(locale)
    ? (locale as Locale)
    : ("id" as Locale);
  const content = getContent(safeLocale);

  return (
    <>
      <a
        href="#hero"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-navy-900 focus:shadow"
      >
        {content.common.skipToContent}
      </a>

      <Nav content={content} locale={safeLocale} />

      <main id="main">
        <Hero content={content} />
        <DataToIntelligence content={content} />
        <Territories content={content} />
        <ApiSection content={content} />
        <UseCases content={content} />
        <FinalCTA content={content} />
      </main>

      <Footer content={content} locale={safeLocale} />
    </>
  );
}