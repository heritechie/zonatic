"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { LOCALES, type Locale } from "@/content";
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
 * The active locale is computed from the current URL (via
 * `usePathname`) and visually highlighted. Switching routes to the
 * same page in the other locale by replacing the leading `/<locale>/`
 * segment, so anchors (`#territories`, etc.) are preserved.
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
    return LOCALES.map((locale) => {
      // Strip the current leading `/{locale}/` segment, then prepend
      // `/{otherLocale}/`. Falls back to `/${otherLocale}/` if pathname
      // is unexpectedly short.
      const segments = pathname?.split("/") ?? [];
      if (segments[1] === currentLocale) {
        segments[1] = locale;
      } else {
        segments.unshift("", locale);
      }
      return { locale, href: segments.join("/") || `/${locale}/` };
    });
  }, [pathname, currentLocale]);

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