"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { DEFAULT_LOCALE, LOCALES, type Locale } from "@/content";
import { cn } from "@/lib/utils";

type Variant = "desktop" | "mobile" | "footer";

/**
 * Language switcher.
 *
 * Three presentation variants:
 *   - `desktop` segmented pill (header)
 *   - `mobile` two-button row (mobile menu)
 *   - `footer` standalone pill rendered below the brand tagline
 *
 * The current locale is read from the URL rather than a prop, because the
 * Indonesian default is served both at `/` and at `/id/`. The switcher
 * therefore strips a leading locale segment (if there is one) and re-adds
 * the target locale, keeping the rest of the path — and any anchor —
 * intact. Indonesian resolves to `/` for the homepage and to `/id/<path>`
 * for nested pages.
 *
 * No client-side persistence is required: the URL itself is the
 * source of truth, and Next.js prerenders one HTML file per locale.
 */
export function LanguageSwitcher({
  variant = "desktop",
  currentLocale,
  className,
}: {
  variant?: Variant;
  currentLocale: Locale;
  className?: string;
}) {
  const pathname = usePathname();

  const targets = useMemo(() => {
    const segments = (pathname ?? "/").split("/").filter(Boolean);

    // Drop a leading locale segment so re-prefixing cannot double it up.
    if (segments.length > 0 && (LOCALES as readonly string[]).includes(segments[0])) {
      segments.shift();
    }

    const rest = segments.length > 0 ? `/${segments.join("/")}` : "";

    return LOCALES.map((locale) => ({
      locale,
      // Indonesian homepage is the site root; everything else is prefixed.
      href:
        locale === DEFAULT_LOCALE && !rest ? "/" : `/${locale}${rest}`,
    }));
  }, [pathname]);

  if (variant === "mobile") {
    return (
      <div
        role="group"
        aria-label="Language"
        className={cn("grid grid-cols-2 gap-2", className)}
      >
        {targets.map(({ locale, href }) => (
          <Link
            key={locale}
            href={href}
            hrefLang={locale}
            aria-current={locale === currentLocale ? "true" : undefined}
            className={cn(
              "inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm font-medium transition-colors",
              locale === currentLocale
                ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                : "border-slate-300 bg-white text-navy-700 hover:bg-slate-50"
            )}
          >
            {locale === "id" ? "Bahasa Indonesia" : "English"}
          </Link>
        ))}
      </div>
    );
  }

  return (
    <div
      role="group"
      aria-label="Language"
      className={cn(
        "inline-flex items-center rounded-md border border-slate-200 bg-white p-0.5 text-xs font-medium",
        className
      )}
    >
      {targets.map(({ locale, href }) => (
        <Link
          key={locale}
          href={href}
          hrefLang={locale}
          aria-current={locale === currentLocale ? "true" : undefined}
          className={cn(
            "inline-flex h-7 items-center justify-center rounded px-2.5 transition-colors",
            locale === currentLocale
              ? "bg-emerald-600 text-white shadow-sm"
              : "text-navy-600 hover:text-navy-900"
          )}
        >
          {locale.toUpperCase()}
        </Link>
      ))}
    </div>
  );
}