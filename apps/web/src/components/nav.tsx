"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/brand-logo";
import type { Content, Locale } from "@/content";

/**
 * Minimal white navbar:
 *   [Zonatic logo] ........... [Product · Solutions · Pricing · Docs]
 *                                          [ID | EN]   [Start later]]
 *
 * Mobile: hamburger + combined flat menu + language switcher + sign-in.
 *
 * The header is fixed; on-scroll it picks up a subtle border for
 * legibility once content scrolls under it.
 */
export function Nav({
  content,
  locale,
}: {
  content: Content;
  locale: Locale;
}) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 8);
    handler();
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handler = () => setOpen(false);
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, [open]);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-colors duration-200",
        scrolled || open
          ? "bg-white/90 backdrop-blur-md border-b border-slate-200/70"
          : "bg-white border-b border-transparent"
      )}
    >
      <nav
        className="mx-auto flex h-[4.5rem] max-w-7xl items-center justify-between px-6 lg:px-8"
        aria-label="Primary"
      >
        <Link href={`/${locale}/`} className="flex items-center">
          <BrandLogo className="h-9 w-auto" priority />
        </Link>

        <ul className="hidden lg:flex items-center gap-1">
          {content.nav.links.map((link) => (
            <li key={link.label}>
              <Link
                href={link.href}
                className="rounded-md px-3 py-2 text-sm font-medium text-navy-700 hover:text-navy-900 hover:bg-slate-100 transition-colors"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="hidden lg:flex items-center gap-3">
          <Link
            href="#get-started"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors"
          >
            {content.nav.getStarted}
            <span aria-hidden="true">→</span>
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="lg:hidden inline-flex items-center justify-center rounded-md p-2 text-navy-700 hover:bg-slate-100"
          aria-controls="mobile-menu"
          aria-expanded={open}
          aria-label={open ? content.nav.mobileClose : content.nav.mobileOpen}
        >
          {open ? (
            <X className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Menu className="h-5 w-5" aria-hidden="true" />
          )}
        </button>
      </nav>

      <MobileMenu
        open={open}
        links={content.nav.links}
        locale={locale}
        getStartedLabel={content.nav.getStarted}
        onNavigate={() => setOpen(false)}
      />
    </header>
  );
}

function MobileMenu({
  open,
  links,
  // locale unused after removing language switcher from mobile nav
  getStartedLabel,
  onNavigate,
}: {
  open: boolean;
  links: { label: string; href: string }[];
  locale: Locale;
  getStartedLabel: string;
  onNavigate: () => void;
}) {
  if (!open) return null;
  return (
    <div
      id="mobile-menu"
      className="lg:hidden border-t border-slate-200 bg-white"
    >
      <div className="mx-auto max-w-7xl px-6 py-4">
        <ul className="space-y-1">
          {links.map((link) => (
            <li key={link.label}>
              <Link
                href={link.href}
                onClick={onNavigate}
                className="block rounded-md px-3 py-2 text-base font-medium text-navy-700 hover:bg-slate-50 hover:text-navy-900"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-4 border-t border-slate-200 pt-4">
          {/* Language switcher removed from mobile nav per design update */}
        </div>
        <div className="mt-3">
          <Link
            href="#get-started"
            onClick={onNavigate}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white"
          >
            {getStartedLabel}
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </div>
  );
}