import { cn } from "@/lib/utils";
import type { Content } from "@/content";

/**
 * API as the bridge between location and business decision.
 *
 *   Left  | eyebrow, headline, copy, then the chain
 *         | LOCATION -> ZONATIC API -> ZONE -> BUSINESS RULE -> DECISION,
 *         | and a short boundary statement.
 *
 *   Right | one request, the response it returns, and the rules a caller
 *         | could derive from that response.
 *
 * This used to be a three-column developer-documentation panel: language
 * tabs, a window chrome with three fake dots, and a "popular endpoints"
 * list. It read as documentation rather than as the product's main idea,
 * which is that location context becomes a business rule. So the tabs,
 * chrome and endpoint list are gone; one concrete example now carries the
 * whole argument.
 *
 * Server component — there is no longer any tab state to hydrate.
 */
export function ApiSection({ content }: { content: Content }) {
  const a = content.api;

  return (
    <section
      id="api"
      aria-labelledby="api-headline"
      className="bg-navy-900 py-20 sm:py-24 lg:py-28"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-14">
          {/* Left column — the argument */}
          <div className="lg:col-span-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
              {a.eyebrow}
            </p>
            <h2
              id="api-headline"
              className="mt-4 text-3xl font-bold leading-[1.1] tracking-tight text-white sm:text-4xl lg:text-[2.75rem]"
            >
              {a.headline}
            </h2>
            <p className="mt-5 text-[0.95rem] leading-7 text-slate-300 sm:text-base">
              {a.description}
            </p>

            <FlowChain steps={a.flow} />

            <p className="mt-8 max-w-md text-[0.8125rem] leading-6 text-slate-400">
              {a.disclaimer}
            </p>
          </div>

          {/* Right column — one request, one response, the rules it enables */}
          <div className="grid gap-6 lg:col-span-7 sm:grid-cols-2">
            <div className="space-y-6">
              <RequestPanel label={a.request.label} request={a.request} />
              <ResponsePanel label={a.response.label} json={a.response.json} />
            </div>
            <RulesPanel rules={a.rules} />
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * The chain that makes Zonatic legible in one glance. A vertical spine on
 * the left ties the steps together, so it reads as one pipeline rather than
 * five separate labels.
 */
function FlowChain({ steps }: { steps: string[] }) {
  return (
    <ol className="mt-9 max-w-sm">
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1;
        return (
          <li key={step} className="relative flex items-center gap-4 pb-4 last:pb-0">
            {!isLast ? (
              <span
                aria-hidden="true"
                className="absolute left-[0.4375rem] top-5 h-full w-px bg-slate-700"
              />
            ) : null}
            <span
              aria-hidden="true"
              className={cn(
                "relative z-10 h-3.5 w-3.5 shrink-0 rounded-full border-2",
                isLast
                  ? "border-emerald-400 bg-emerald-400"
                  : "border-slate-600 bg-navy-900",
              )}
            />
            <span
              className={cn(
                "text-[0.8125rem] font-semibold uppercase tracking-[0.12em]",
                isLast ? "text-emerald-300" : "text-slate-300",
              )}
            >
              {step}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function RequestPanel({
  label,
  request,
}: {
  label: string;
  request: Content["api"]["request"];
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-950">
      <p className="border-b border-slate-800 px-5 py-2.5 text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>
      <div className="flex items-start gap-3 px-5 py-4">
        <span className="mt-0.5 inline-flex shrink-0 rounded bg-emerald-500/15 px-2 py-0.5 font-mono text-[0.75rem] font-semibold text-emerald-300">
          {request.method}
        </span>
        <code className="min-w-0 font-mono text-[0.8125rem] leading-6 text-slate-100">
          {request.path}
        </code>
      </div>
    </div>
  );
}

function ResponsePanel({ label, json }: { label: string; json: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-950">
      <p className="border-b border-slate-800 px-5 py-2.5 text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>
      <pre className="overflow-x-auto px-5 py-4 font-mono text-[0.8125rem] leading-6 text-slate-200">
        <code>{json}</code>
      </pre>
    </div>
  );
}

/**
 * The rules panel is the point of the section: the same response, read as
 * decisions. Outcome only tints the value, so the emphasis stays on the
 * rule itself rather than on a label describing the rule.
 */
function RulesPanel({ rules }: { rules: Content["api"]["rules"] }) {
  return (
    <div className="flex flex-col rounded-xl border border-slate-700 bg-slate-900/60 p-6">
      <p className="text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-slate-400">
        {rules.label}
      </p>

      <dl className="mt-5 flex gap-8 border-b border-slate-700 pb-5">
        <div>
          <dt className="text-[0.75rem] uppercase tracking-wider text-slate-400">
            {rules.zoneLabel}
          </dt>
          <dd className="mt-1 text-lg font-semibold text-white">{rules.zone}</dd>
        </div>
        <div>
          <dt className="text-[0.75rem] uppercase tracking-wider text-slate-400">
            {rules.scoreLabel}
          </dt>
          <dd className="mt-1 text-lg font-semibold text-emerald-300">
            {rules.score}
          </dd>
        </div>
      </dl>

      <ul className="mt-5 space-y-3.5">
        {rules.items.map((item) => (
          <li
            key={item.label}
            className="flex items-center justify-between gap-4 text-[0.875rem]"
          >
            <span className="text-slate-300">{item.label}</span>
            <span className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  item.outcome === "positive" ? "bg-emerald-400" : "bg-slate-600",
                )}
              />
              <span
                className={cn(
                  "font-mono",
                  item.outcome === "positive"
                    ? "text-emerald-300"
                    : "text-slate-300",
                )}
              >
                {item.value}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
