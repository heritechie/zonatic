import type { Metadata, Viewport } from "next";
import { DEFAULT_LOCALE, getContent } from "@/content";
import { buildMetadata } from "@/lib/seo";

/**
 * Root-route layout (route group `(default)` -> path `/`).
 *
 * Indonesian is the default language, so the site root renders the
 * Indonesian homepage directly instead of redirecting to `/id/`.
 *
 * This layout owns `<html>`/`<body>` for the `/` route, mirroring
 * `app/[locale]/layout.tsx`, which owns them for `/id/` and `/en/`. Each
 * route has exactly one root-to-leaf layout chain, so exactly one of them
 * provides the document shell.
 *
 * The `lang` attribute is fixed to Indonesian because this route only ever
 * serves Indonesian content.
 */
export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata(getContent(DEFAULT_LOCALE), DEFAULT_LOCALE);
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0a1628",
};

export default function DefaultLocaleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const content = getContent(DEFAULT_LOCALE);
  return (
    <html lang={content.htmlLang}>
      <body className="min-h-screen bg-white text-navy-900 antialiased">
        {children}
      </body>
    </html>
  );
}