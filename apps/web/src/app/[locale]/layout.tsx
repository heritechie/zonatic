import type { Metadata, Viewport } from "next";
import { getContent } from "@/content";
import { buildMetadata } from "@/lib/seo";

/**
 * Locale-scoped layout.
 *
 * Owns the actual `<html lang>` and `<body>` tags. The `lang`
 * attribute is sourced from the content tree so the right language
 * is reflected at the document level (screen readers, browser
 * translation prompts, Open Graph locale, etc.).
 *
 * The Indonesian default language is *also* served from the site root by
 * `app/(default)/layout.tsx`, which owns the document shell for that route.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const content = getContent(locale);

  return buildMetadata(content, content.locale);
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