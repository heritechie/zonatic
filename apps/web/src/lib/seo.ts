import type { Metadata } from "next";
import { DEFAULT_LOCALE, LOCALES, type Content, type Locale } from "@/content";

/**
 * Canonical path for a locale + page.
 *
 * Indonesian is the default language, so the Indonesian homepage is
 * served at the site root (`/`) rather than under a `/id/` prefix. Every
 * other Indonesian page keeps its locale prefix (`/id/about`), and English
 * is always prefixed (`/en/`).
 *
 *   localePath("id")        -> "/"
 *   localePath("en")        -> "/en/"
 *   localePath("id", "about") -> "/id/about"
 *   localePath("en", "about") -> "/en/about"
 */
export function localePath(locale: Locale, path = ""): string {
  const rest = path.replace(/^\/+|\/+$/g, "");
  const suffix = rest ? `/${rest}` : "";
  if (!suffix && locale === DEFAULT_LOCALE) return "/";
  return `/${locale}${suffix}`;
}

/** Root-relative hreflang key for a locale (`id-ID` / `en`). */
function hrefLang(locale: Locale): string {
  return locale === "id" ? "id-ID" : "en";
}

/**
 * Build page metadata with canonical + hreflang wiring.
 *
 * `/` is the canonical Indonesian homepage. `/id/` is a valid alternate
 * entry point to the exact same content, so it declares `/` as canonical
 * rather than redirecting — that avoids the redirect the old build
 * emitted from `/` to `/id/` and keeps one canonical URL per language.
 */
export function buildMetadata(
  content: Content,
  locale: Locale,
  path = ""
): Metadata {
  const siteUrl = content.meta.siteUrl.replace(/\/+$/, "");
  const canonical = `${siteUrl}${localePath(locale, path)}`;

  const languages = Object.fromEntries(
    LOCALES.map((l) => [hrefLang(l), `${siteUrl}${localePath(l, path)}`])
  );

  // Every language version of a page lists itself as `x-default`
  // except the default language, which is the root URL.
  languages["x-default"] = `${siteUrl}${localePath(DEFAULT_LOCALE, path)}`;

  return {
    metadataBase: new URL(content.meta.siteUrl),
    title: {
      default: content.meta.title,
      template: `%s | ${content.nav.brand}`,
    },
    description: content.meta.description,
    applicationName: content.nav.brand,
    keywords: [
      "Location Intelligence",
      "Territories",
      "Location Data",
      "Geographic Infrastructure",
      "Indonesia",
      "Reverse Geocoding",
    ],
    authors: [{ name: content.nav.brand }],
    creator: content.nav.brand,
    publisher: content.nav.brand,
    robots: { index: true, follow: true },
    alternates: {
      canonical,
      languages,
    },
    openGraph: {
      type: "website",
      locale: content.meta.ogLocale,
      url: canonical,
      siteName: content.nav.brand,
      title: content.meta.title,
      description: content.meta.description,
      alternateLocale:
        content.meta.ogLocale === "id_ID" ? ["en_ID"] : ["id_ID"],
      images: [
        {
          url: `${siteUrl}/assets/social/og-image.webp`,
          width: 1200,
          height: 630,
          alt: content.meta.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: content.meta.title,
      description: content.meta.description,
      images: [`${siteUrl}/assets/social/og-image.webp`],
    },
    icons: {
      icon: [
        {
          url: `${siteUrl}/favicon.svg`,
          type: "image/svg+xml",
        },
      ],
    },
  };
}