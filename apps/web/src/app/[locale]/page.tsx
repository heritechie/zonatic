import { HomePage } from "@/components/home-page";
import { LOCALES, DEFAULT_LOCALE, type Locale } from "@/content";

/**
 * Locale-prefixed homepage (`/id/`, `/en/`).
 *
 * `/id/` renders the same Indonesian content as `/` and declares `/` as
 * its canonical URL (see `buildMetadata`), so `/` stays the single
 * canonical Indonesian homepage while explicit `/id/` links keep working.
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
    : DEFAULT_LOCALE;

  return <HomePage locale={safeLocale} />;
}