/**
 * Centralised content layer for the Zonatic landing page.
 *
 * Every user-facing string on the landing page must come from this
 * content tree — never hardcoded in components — so that translations
 * stay in lockstep across sections.
 */

export type Locale = "id" | "en";

export const LOCALES: readonly Locale[] = ["id", "en"] as const;

export const DEFAULT_LOCALE: Locale = "id";

export type NavLink = { label: string; href: string };
export type NavGroup = { label: string; links: NavLink[] };

export type UseCase = {
  title: string;
  description: string;
  iconKey:
    | "coins"
    | "store"
    | "wrench"
    | "shield-check"
    | "shopping-basket"
    | "truck";
};

export type Capability = {
  label: string;
  description: string;
  iconKey:
    | "database"
    | "globe"
    | "map"
    | "code";
};

export type TerritoryCard = {
  title: string;
  description: string;
};

export type Content = {
  locale: Locale;
  htmlLang: string;
  meta: {
    title: string;
    description: string;
    ogLocale: string;
    siteUrl: string;
  };
common: {
    skipToContent: string;
    signIn: string;
    getStarted: string;
    viewDocumentation: string;
    placeholderRouteNote: string;
    illustrativeNumbers: string;
    /**
     * Pre-rendered "Step 1", "Step 2", "Step 3" labels for the four
     * possible step indices (1–4). Index 0 is left empty so callers
     * can read `stepLabels[n]` directly.
     */
    stepLabels: string[];
    notFoundHeading: string;
    notFoundBody: string;
    notFoundCta: string;
  };
  nav: {
    brand: string;
    /** Top-level nav items rendered inline in the navbar. */
    links: { label: string; href: string }[];
    signIn: string;
    getStarted: string;
    mobileOpen: string;
    mobileClose: string;
  };
  hero: {
    eyebrow: string;
    /**
     * Two-line headline. The page renders these as
     * `<span>{headlineLine1}</span> <span>{headlineLine2}</span>` so the
     * emphasis can be tuned per line.
     */
    headlineLine1: string;
    headlineLine2: string;
    headlineHighlight: string;
    description: string;
    primaryCta: string;
    secondaryCta: string;
    /**
     * Optional fine-print shown immediately under the primary CTA.
     * Free to omit per locale.
     */
    ctaFineprint: string;
    /**
     * Four capability pillars shown beneath the two-column hero.
     * The reference layout makes these feel like a continuation of
     * the hero, not a separate strip.
     */
    pillars: { label: string; description: string; iconKey: string }[];
    /**
     * Visual overlay state for the Jakarta map.
     * The actual map image is `/assets/maps/hero-jakarta-map.webp`.
     */
    map: {
      searchPlaceholder: string;
      zoomIn: string;
      zoomOut: string;
      reset: string;
      areaTitle: string;
      areaCountLabel: string;
      summaryCard: {
        totalLabel: string;
        legend: { label: string; count: number; dotClass: string }[];
        disclaimer: string;
      };
    };
  };
  dataToIntel: {
    eyebrow: string;
    headline: string;
    headlineHighlight: string;
    description: string;
    steps: {
      title: string;
      description: string;
      mockRows?: { id: string; name: string; address: string }[];
      stats?: {
        total: string;
        items: { label: string; iconKey: string }[];
      };
      map?: { areaName: string; insideLabel: string; outsideLabel: string };
    }[];
  };
  territories: {
    eyebrow: string;
    headline: string;
    description: string;
    cards: TerritoryCard[];
    /**
     * Short helper line per card explaining the boundary source.
     * Pairs 1:1 with `cards`. Strengthens the three-pillar
     * explanation: administrative areas / custom polygons / combined.
     */
    cardHelpers: string[];
    /**
     * Small badge inside the custom-polygon mock, e.g.
     * "GeoJSON / KML supported".
     */
    polygonSupportedLabel: string;
    createCta: string;
    ctaFootnote: string;
    /**
     * Mock administrative tree used in the first capability card.
     */
    adminTree: {
      label: string;
      children: { label: string; grandchildren: string[] };
    };
    /** Mock kecamatan counts shown on the third capability card. */
    summary: {
      areaName: string;
      badge: string;
      areasLabel: string;
      locationsLabel: string;
      items: { name: string; count: number }[];
    };
  };
  api: {
    eyebrow: string;
    headline: string;
    description: string;
    viewDocs: string;
    tryPlayground: string;
    placeholderNote: string;
    /**
     * Tab labels and code samples for the multi-language code panel.
     * The reference mockup shows cURL, JavaScript, and Python tabs;
     * the curl variant is the default. HTTP method, URL, header and
     * response payload must match the live FastAPI implementation.
     */
    codeTabs: {
      label: string;
      language: "bash" | "javascript" | "python";
      code: string;
    }[];
    /**
     * "Popular endpoints" list shown beside the code panel. Only
     * endpoints actually live in the FastAPI backend today are
     * referenced. Anything else would mislead developers.
     */
    endpointListTitle: string;
    endpointListDescription: string;
    endpointListItems: { method: string; path: string; auth: boolean }[];
    seeAllCta: string;
  };
  useCases: {
    eyebrow: string;
    headline: string;
    description: string;
    cases: UseCase[];
    disclaimer: string;
  };
  finalCta: {
    eyebrow: string;
    headline: string;
    description: string;
    primaryCta: string;
    secondaryCta: string;
  };
  footer: {
    tagline: string;
    columns: { title: string; links: NavLink[] }[];
    copyright: string;
    jurisdiction: string;
    legalLinks: string[];
    /** GitHub + LinkedIn social URLs. Empty array renders nothing. */
    socials: { label: string; href: string; iconKey: "github" | "linkedin" }[];
  };
};