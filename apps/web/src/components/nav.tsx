"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/brand-logo";
import { LanguageSwitcher } from "@/components/language-switcher";
import type { Content, Locale } from "@/content";

/**
 * Navbar with logo, navigation links (Fitur, Data, Use Case, Dokumentasi, Harga),
 * language switcher, and sign-in button.
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

        <div className="hidden lg:flex items-center gap-4">
          <LanguageSwitcher variant="desktop" currentLocale={locale} />
          <Link
            href={content.meta.consoleUrl}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
          >
            {content.nav.signIn}
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
        content={content}
        locale={locale}
        onNavigate={() => setOpen(false)}
      />
    </header>
  );
}

function MobileMenu({
  open,
  content,
  locale,
  onNavigate,
}: {
  open: boolean;
  content: Content;
  locale: Locale;
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
          {content.nav.links.map((link) => (
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
        <div className="mt-4 pt-4 border-t border-slate-200">
          <LanguageSwitcher
            variant="mobile"
            currentLocale={locale}
          />
          <Link
            href={content.meta.consoleUrl}
            onClick={onNavigate}
            className="mt-3 block w-full rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white text-center shadow-sm hover:bg-emerald-700"
          >
            {content.nav.signIn}
          </Link>
        </div>
      </div>
    </div>
  );
}