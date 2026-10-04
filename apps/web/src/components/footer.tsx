import Link from "next/link";
import type { Content, FooterColumn, Locale } from "@/content";
import { BrandLogo } from "@/components/brand-logo";
import { LanguageSwitcher } from "@/components/language-switcher";

/**
 * Localize path-only hrefs (e.g. `/about`) by prefixing the current locale,
 * so that links work from any locale page. External links, `mailto:` links,
 * hash links, and missing hrefs (capability areas with no page yet) are
 * returned unchanged.
 */
function withLocale(href: string | undefined, locale: Locale): string {
  if (!href) return "";
  if (href.startsWith("#")) return href;
  if (href.startsWith("/") && !href.startsWith("//")) {
    return `/${locale}${href}`;
  }

  return href;
}

/**
 * Commercial product footer: brand block on the left, three navigation groups
 * on the right, copyright underneath.
 *
 * Only entries with a real destination render as links. Products and
 * Developer items have no pages yet, so they render as plain labels rather
 * than links to routes that do not exist. Legal pages are linked once, from
 * the Company group; the bottom bar carries only the copyright so nothing is
 * duplicated.
 */
export function Footer({
  content,
  locale,
}: {
  content: Content;
  locale: Locale;
}) {
  const f = content.footer;
  return (
    <footer
      aria-labelledby="footer-heading"
      className="border-t border-slate-200 bg-white"
    >
      <h2 id="footer-heading" className="sr-only">
        Footer
      </h2>
      <div className="mx-auto max-w-7xl px-6 py-14 lg:px-8 lg:py-16">
        <div className="grid gap-x-8 gap-y-12 md:grid-cols-2 lg:grid-cols-12">
          {/* Brand block */}
          <div className="lg:col-span-5">
            <Link href={`/${locale}/`} className="inline-flex">
              <BrandLogo className="h-10 w-auto" />
            </Link>
            <p className="mt-5 max-w-sm text-[0.95rem] leading-7 text-navy-600">
              {f.tagline}
            </p>

            <LanguageSwitcher
              variant="footer"
              currentLocale={locale}
              className="mt-6"
            />
          </div>

          <div className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:col-span-7 lg:grid-cols-3">
            {f.columns.map((column: FooterColumn) => (
              <nav
                key={column.title}
                aria-label={column.title}
                className="text-[0.95rem]"
              >
                <h3 className="text-xs font-semibold uppercase tracking-wider text-navy-500">
                  {column.title}
                </h3>
                <ul className="mt-4 space-y-2.5">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      {link.href ? (
                        link.href.startsWith("mailto:") ? (
                          <a
                            href={link.href}
                            className="text-navy-700 hover:text-navy-900"
                          >
                            {link.label}
                          </a>
                        ) : (
                          <Link
                            href={withLocale(link.href, locale)}
                            className="text-navy-700 hover:text-navy-900"
                          >
                            {link.label}
                          </Link>
                        )
                      ) : (
                        /* Capability area, not a page yet: label only, no link. */
                        <span className="text-navy-500">{link.label}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <div className="mt-14 border-t border-slate-200 pt-8 text-[0.8125rem] text-navy-500">
          <p>
            © {f.copyrightYear} {content.nav.brand}. {f.copyright}
          </p>
        </div>
      </div>
    </footer>
  );
}  