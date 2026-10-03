"use client";

import { useState } from "react";
import Link from "next/link";
import { BookOpen, Play, Lock, Globe, ListTree } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Content } from "@/content";

/**
 * API section.
 *
 * Three-column layout:
 *   Left   | eyebrow, headline, description, two CTAs.
 *   Center | code editor card with cURL/JavaScript/Python tabs.
 *   Right  | "popular endpoints" list with a CTA to see all.
 *
 * The code panel is a small client component (the tab UI uses
 * useState); everything else stays on the server.
 */
export function ApiSection({ content }: { content: Content }) {
  const a = content.api;
  const [activeTab, setActiveTab] = useState(0);
  const tabs = a.codeTabs;
  const active = tabs[activeTab] ?? tabs[0];

  return (
    <section
      id="api"
      aria-labelledby="api-headline"
      className="bg-navy-900 py-20 sm:py-28"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
          {/* Left column — copy + CTAs */}
          <div className="lg:col-span-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
              {a.eyebrow}
            </p>
            <h2
              id="api-headline"
              className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl"
            >
              {a.headline}
            </h2>
            <p className="mt-5 text-[0.95rem] leading-7 text-slate-300 sm:text-base">
              {a.description}
            </p>
            <div className="mt-7 flex flex-col items-stretch gap-3 sm:flex-row lg:flex-col">
              <Link
                href="/docs"
                aria-disabled="true"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors"
              >
                <BookOpen className="h-4 w-4" aria-hidden="true" />
                {a.viewDocs}
                <span aria-hidden="true">→</span>
              </Link>
              <Link
                href="/playground"
                aria-disabled="true"
                className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-600 bg-slate-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 transition-colors"
              >
                <Play className="h-4 w-4" aria-hidden="true" />
                {a.tryPlayground}
              </Link>
            </div>
            <p className="mt-4 text-xs text-slate-400">
              {content.common.placeholderRouteNote}
            </p>
          </div>

          {/* Center column — code editor with tabs */}
          <div className="lg:col-span-6">
            <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-950 shadow-lg">
              {/* Tab strip */}
              <div
                role="tablist"
                aria-label="Bahasa kode"
                className="flex items-center gap-0 border-b border-slate-800 bg-slate-900/80 px-3"
              >
                {tabs.map((tab, i) => (
                  <button
                    key={tab.label}
                    type="button"
                    role="tab"
                    aria-selected={i === activeTab}
                    onClick={() => setActiveTab(i)}
                    className={cn(
                      "relative -mb-px px-4 py-3 text-[0.875rem] font-medium transition-colors",
                      i === activeTab
                        ? "text-white border-b-2 border-emerald-400"
                        : "text-slate-400 hover:text-slate-200"
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
                <div className="ml-auto flex gap-1.5 px-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-700" />
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-700" />
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-700" />
                </div>
              </div>

              {/* Code */}
              <div className="overflow-x-auto p-6 font-mono text-sm leading-7 text-slate-100">
                <pre>
                  <code>{active?.code ?? ""}</code>
                </pre>
              </div>
            </div>
          </div>

          {/* Right column — popular endpoints */}
          <aside className="lg:col-span-3">
            <div className="rounded-xl border border-slate-700 bg-slate-900/90 p-6">
              <div className="flex items-center gap-2 text-white">
                <ListTree
                  className="h-4 w-4 text-emerald-400"
                  aria-hidden="true"
                />
                <h3 className="text-[0.95rem] font-semibold">
                  {a.endpointListTitle}
                </h3>
              </div>
              <p className="mt-1.5 text-[0.875rem] text-slate-400">
                {a.endpointListDescription}
              </p>
              <ul className="mt-5 space-y-2.5 text-sm">
                {a.endpointListItems.map((endpoint) => (
                  <Endpoint
                    key={endpoint.path}
                    method={endpoint.method}
                    path={endpoint.path}
                    auth={endpoint.auth}
                  />
                ))}
              </ul>
              <Link
                href="/docs"
                aria-disabled="true"
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md border border-slate-600 bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 transition-colors"
              >
                <span>{a.seeAllCta}</span>
                <span aria-hidden="true">→</span>
              </Link>
              <p className="mt-5 text-[0.8125rem] text-slate-400">
                {a.placeholderNote}
              </p>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

function Endpoint({
  method,
  path,
  auth,
}: {
  method: string;
  path: string;
  auth: boolean;
}) {
  return (
    <li className="flex items-center gap-2 rounded-md border border-slate-700 bg-slate-950 px-3 py-2">
      <span className="inline-flex w-16 justify-center rounded bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[0.75rem] font-semibold text-emerald-300">
        {method}
      </span>
      <code className="min-w-0 flex-1 truncate font-mono text-sm text-slate-200">
        {path}
      </code>
      <span
        className="inline-flex items-center gap-1 text-[0.8125rem] text-slate-400"
        aria-label={auth ? "Requires API key" : "Public endpoint"}
      >
        {auth ? (
          <>
            <Lock className="h-3 w-3" aria-hidden="true" />
          </>
        ) : (
          <>
            <Globe className="h-3 w-3" aria-hidden="true" />
          </>
        )}
      </span>
    </li>
  );
}