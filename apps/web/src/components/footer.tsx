import Link from "next/link";
import { Github, Linkedin } from "lucide-react";
import type { Content, Locale, NavLink } from "@/content";
import { BrandLogo } from "@/components/brand-logo";
import { LanguageSwitcher } from "@/components/language-switcher";

/**
 * Localize path-only hrefs (e.g. `#hero`, `/docs`) by prefixing the
 * current locale, so that links work from any locale page.
 * External links and `mailto:` are returned unchanged.
 */
function withLocale(href: string, locale: Locale): string {
  if (href.startsWith("#")) return href;
  if (href.startsWith("/") && !href.startsWith("//")) {
    return `/${locale}${href}`;
  }

  return href;
}

/**
 * Footer with four link columns, a brand language switcher, social
 * icons, and legal links.
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
          <div className="lg:col-span-4">
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

            <ul className="mt-6 flex items-center gap-3">
              {f.socials.map((social) => (
                <li key={social.label}>
                  <a
                    href={social.href}
                    aria-label={social.label}
                    rel="noopener noreferrer"
                    target="_blank"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-navy-500 hover:bg-slate-50 hover:text-navy-900 transition-colors"
                  >
                    {social.iconKey === "github" ? (
                      <Github className="h-[1.15rem] w-[1.15rem]" aria-hidden="true" />
                    ) : (
                      <Linkedin className="h-[1.15rem] w-[1.15rem]" aria-hidden="true" />
                    )}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:col-span-8 lg:grid-cols-4">
            {f.columns.map((column: { title: string; links: NavLink[] }) => (
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
                      <Link
                        href={withLocale(link.href, locale)}
                        className="text-navy-700 hover:text-navy-900"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <div className="mt-14 flex flex-col items-start justify-between gap-4 border-t border-slate-200 pt-8 text-[0.8125rem] text-navy-500 sm:flex-row sm:items-center">
          <p>
            © {new Date().getFullYear()} {content.nav.brand}. {f.copyright}
          </p>
          <ul className="flex items-center gap-6">
            {f.legalLinks.map((label) => (
              <li key={label}>
                <Link
                  href={`/${locale}/${label
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, "-")
                    .replace(/^-|-$/g, "")}`}
                  className="text-navy-500 hover:text-navy-700"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <p className="mt-4 text-[0.8125rem] text-navy-400">{f.jurisdiction}</p>
      </div>
    </footer>
  );
}

function _FooterLogo() {
  return null;
}  