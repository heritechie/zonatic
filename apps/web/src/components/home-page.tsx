import { Nav } from "@/components/nav";
import { Hero } from "@/components/hero";
import { Problem } from "@/components/problem";
import { DataSources } from "@/components/data-sources";
import { Features } from "@/components/features";
import { ApiExample } from "@/components/api-example";
import { UseCases } from "@/components/use-cases";
import { FinalCTA } from "@/components/final-cta";
import { Footer } from "@/components/footer";
import { getContent, type Locale } from "@/content";

/**
 * The full landing page: header, all sections, and the footer.
 *
 * Shared by both entry points that render the homepage so the markup has a
 * single source of truth:
 *   - `/`      (Indonesian default, served by `app/(default)/page.tsx`)
 *   - `/id/`   and `/en/`  (served by `app/[locale]/page.tsx`)
 *
 * Section order follows the product argument:
 *   hero -> problem -> data sources -> features -> api example -> use cases -> final CTA.
 */
export function HomePage({ locale }: { locale: Locale }) {
  const content = getContent(locale);

  return (
    <>
      <a
        href="#hero"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-navy-900 focus:shadow"
      >
        {content.common.skipToContent}
      </a>

      <Nav content={content} locale={locale} />

      <main id="main">
        <Hero content={content} />
        <Problem content={content} />
        <DataSources content={content} />
        <Features content={content} />
        <ApiExample content={content} />
        <UseCases content={content} />
        <FinalCTA content={content} />
      </main>

      <Footer content={content} locale={locale} />
    </>
  );
}