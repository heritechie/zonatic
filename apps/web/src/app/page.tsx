import { DEFAULT_LOCALE } from "@/content";

/**
 * Root page simply redirects to the default locale's landing page.
 *
 * Static export does not support redirect routes via `redirect()`,
 * so the actual default redirect is achieved via meta-refresh +
 * canonical link in the rendered HTML. The cleanest implementation
 * is a small landing page that immediately links to the default
 * locale; this keeps the build purely static and avoids needing a
 * server runtime.
 */
export default function RootPage() {
  const target = `/${DEFAULT_LOCALE}/`;
  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-6">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
          Zonatic
        </p>
        <p className="mt-3 text-base text-navy-600">
          Redirecting to{" "}
          <a
            href={target}
            className="font-medium text-emerald-700 underline underline-offset-4 hover:text-emerald-800"
          >
            {target}
          </a>
          ...
        </p>
        <noscript>
          <p className="mt-3 text-sm text-navy-500">
            JavaScript is disabled. Please follow the link above.
          </p>
        </noscript>
        <meta httpEquiv="refresh" content={`0; url=${target}`} />
      </div>
    </main>
  );
}