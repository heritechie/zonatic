import Link from "next/link";
import { DEFAULT_LOCALE, getContent, type Locale } from "@/content";

/**
 * Locale-aware 404 page.
 *
 * The root `app/not-found.tsx` is not present so Next.js bubbles the
 * 404 to the closest segment that has one — i.e. `app/[locale]/not-found.tsx`.
 * The page resolves content for the requested locale if present in the
 * URL, otherwise falls back to the default locale.
 *
 * `params` is typed as optional because Next.js may render this
 * component during the build prerender pass without locale params
 * (e.g. when a sibling segment throws `notFound()`). Both shapes are
 * accepted and the locale falls back to the default in that case.
 */
export default async function LocaleNotFound({
  params,
}: {
  params?: Promise<{ locale?: string }>;
}) {
  const resolved = params ? await params : undefined;
  const requested: string | undefined = resolved?.locale;
  const safeLocale: Locale =
    requested === "id" || requested === "en"
      ? (requested as Locale)
      : DEFAULT_LOCALE;
  const content = getContent(safeLocale);

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-6">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
          404
        </p>
        <h1 className="mt-3 text-3xl font-bold text-navy-900 sm:text-4xl">
          {content.common.notFoundHeading}
        </h1>
        <p className="mt-4 text-base text-navy-600">
          {content.common.notFoundBody}
        </p>
        <Link
          href={`/${safeLocale}/`}
          className="mt-8 inline-flex items-center justify-center rounded-md bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
        >
          {content.common.notFoundCta}
        </Link>
      </div>
    </main>
  );
}