import type { Metadata, Viewport } from "next";
import { getContent } from "@/content";

/**
 * Locale-scoped layout.
 *
 * Owns the actual `<html lang>` and `<body>` tags. The `lang`
 * attribute is sourced from the content tree so the right language
 * is reflected at the document level (screen readers, browser
 * translation prompts, Open Graph locale, etc.).
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const content = getContent(locale);

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
      canonical: `${content.meta.siteUrl}/${locale}/`,
      languages: {
        "id-ID": `${content.meta.siteUrl}/id/`,
        en: `${content.meta.siteUrl}/en/`,
      },
    },
    openGraph: {
      type: "website",
      locale: content.meta.ogLocale,
      url: `${content.meta.siteUrl}/${locale}/`,
      siteName: content.nav.brand,
      title: content.meta.title,
      description: content.meta.description,
      alternateLocale:
        content.meta.ogLocale === "id_ID" ? ["en_ID"] : ["id_ID"],
      // Brand-approved Open Graph image (PNG/WebP). If the file is
      // missing the page still renders; social crawlers fall back
      // to the page description.
      images: [
        {
          url: `${content.meta.siteUrl}/assets/social/og-image.webp`,
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
      images: [`${content.meta.siteUrl}/assets/social/og-image.webp`],
    },
    icons: {
      icon: [
        {
          url: `${content.meta.siteUrl}/favicon.svg`,
          type: "image/svg+xml",
        },
      ],
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0a1628",
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const content = getContent(locale);
  return (
    <html lang={content.htmlLang}>
      <body className="min-h-screen bg-white text-navy-900 antialiased">
        {children}
      </body>
    </html>
  );
}