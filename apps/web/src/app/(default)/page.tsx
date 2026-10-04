import { HomePage } from "@/components/home-page";
import { DEFAULT_LOCALE } from "@/content";

/**
 * The site root `/`.
 *
 * Renders the Indonesian homepage directly with HTTP 200 — there is no
 * redirect to `/id/`. This route is the canonical Indonesian homepage.
 * `/id/` continues to render the same Indonesian content for explicit
 * locale-prefixed links, and declares `/` as its canonical URL via
 * metadata, so the two are not treated as duplicate content.
 */
export default function DefaultLocalePage() {
  return <HomePage locale={DEFAULT_LOCALE} />;
}