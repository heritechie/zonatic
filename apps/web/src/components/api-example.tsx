"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Content } from "@/content";

/**
 * API Example section: code tabs and response.
 *
 * Left: tabs for cURL, JavaScript, Python with code examples
 * Right: JSON response panel
 */
export function ApiExample({ content }: { content: Content }) {
  const a = content.apiExample;
  const [activeTab, setActiveTab] = useState(0);

  return (
    <section
      id="api-example"
      aria-labelledby="api-example-headline"
      className="bg-navy-900 py-20 sm:py-24 lg:py-28"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
            {a.eyebrow}
          </p>
          <h2
            id="api-example-headline"
            className="mt-4 text-3xl font-bold leading-[1.1] tracking-tight text-white sm:text-4xl lg:text-[2.75rem]"
          >
            {a.headline}
          </h2>
          <p className="mt-5 text-[0.95rem] leading-7 text-slate-300 sm:text-base">
            {a.description}
          </p>
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-2 lg:gap-12">
          {/* Left column — code tabs */}
          <div className="space-y-6">
            <div role="tablist" aria-label="Code examples" className="flex gap-2">
              {a.tabs.map((tab, index) => (
                <button
                  key={tab.label}
                  role="tab"
                  aria-selected={activeTab === index}
                  aria-controls={`api-tabpanel-${index}`}
                  id={`api-tab-${index}`}
                  onClick={() => setActiveTab(index)}
                  className={cn(
                    "rounded-md px-4 py-2 text-sm font-medium transition-colors",
                    activeTab === index
                      ? "bg-emerald-600 text-white"
                      : "text-slate-300 hover:text-white hover:bg-slate-800"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div
              role="tabpanel"
              id={`api-tabpanel-${activeTab}`}
              aria-labelledby={`api-tab-${activeTab}`}
              className="overflow-hidden rounded-xl border border-slate-700 bg-slate-950"
            >
              <div className="border-b border-slate-800 px-4 py-2.5 flex items-center justify-between">
                <p className="text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  {a.tabs[activeTab].label}
                </p>
                <button
                  className="inline-flex items-center gap-1.5 rounded bg-slate-800 px-2.5 py-1 text-[0.75rem] font-mono text-slate-300 hover:bg-slate-700"
                  aria-label="Copy to clipboard"
                >
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 012-2h10a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V5a2 2 0 012-2h10a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2v-1" />
                  </svg>
                  <span className="text-[0.6875rem]">Copy</span>
                </button>
              </div>
              <pre className="overflow-x-auto px-4 py-4 font-mono text-[0.8125rem] leading-6 text-slate-200">
                <code>{a.tabs[activeTab].code}</code>
              </pre>
            </div>
          </div>

          {/* Right column — response panel */}
          <div className="space-y-6">
            <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-950">
              <p className="border-b border-slate-800 px-4 py-2.5 text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-slate-400">
                {a.response.label}
              </p>
              <pre className="overflow-x-auto px-4 py-4 font-mono text-[0.8125rem] leading-6 text-slate-200">
                <code>{a.response.json}</code>
              </pre>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}