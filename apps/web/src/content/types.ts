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

/**
 * Footer link. `href` is optional on purpose: the product column lists
 * capability areas rather than standalone pages, so those entries are
 * rendered as plain text labels and never become dead links.
 */
export type FooterLink = { label: string; href?: string };
export type FooterColumn = { title: string; links: FooterLink[] };

/**
 * A use case names an *example* of how a customer may apply Zonatic.
 * It is not a statement of Zonatic's own product scope.
 */
export type UseCase = {
  title: string;
  description: string;
  iconKey:
    | "coins"
    | "store"
    | "truck"
    | "target"
    | "shopping-cart"
    | "navigation"
    | "bar-chart"
    | "building"
    | "code"
    | "map"
    | "mail"
    | "globe"
    | "navigation";
};

/**
 * A short capability line. Rendered as plain text, never as a card:
 * the page deliberately keeps one idea per section.
 */
export type Capability = {
  label: string;
  description: string;
};

/**
 * Problem section: explains the pain point Zonatic solves.
 */
export type Problem = {
  eyebrow: string;
  headline: string;
  description: string;
  imageAlt: string;
};

/**
 * Data Sources section: three trusted sources.
 */
export type DataSource = {
  title: string;
  description: string;
  iconKey: string;
  verified: boolean;
};

export type DataSources = {
  eyebrow: string;
  headline: string;
  description: string;
  sources: DataSource[];
  /**
   * Status labels shown on each data source card.
   */
  labels: {
    verified: string;
  };
};

/**
 * Features section: four key feature cards.
 */
export type Feature = {
  title: string;
  description: string;
  iconKey: string;
};

export type Features = {
  eyebrow: string;
  headline: string;
  description: string;
  features: Feature[];
};

/**
 * API Example section: code tabs and response.
 */
export type ApiExampleTab = {
  label: string;
  code: string;
};

export type ApiExampleResponse = {
  label: string;
  json: string;
};

export type ApiExample = {
  eyebrow: string;
  headline: string;
  description: string;
  tabs: ApiExampleTab[];
  /**
   * Short note shown under the code panel about setting the API key
   * environment variable before running the examples.
   */
  envNote: string;
  /**
   * Short note shown under the response panel indicating that the
   * displayed JSON is a preview, not the full response.
   */
  previewNote: string;
  response: {
    label: string;
    json: string;
  };
};

export type PricingTier = {
  /**
   * Display name of the API category, e.g. "Reverse Geocoding".
   */
  name: string;
  /**
   * Primary price label, e.g. "Rp15.000 / 1.000 request".
   * Displayed as the most prominent price information on the card.
   */
  priceLabel: string;
  /**
   * Secondary per-request note, e.g. "Setara Rp15 per request."
   * Displayed as a smaller secondary line under the primary price.
   */
  priceNote: string;
  /**
   * Short description of what this tier covers.
   */
  description: string;
};

export type PricingAdvantage = {
  title: string;
  description: string;
};

export type Pricing = {
  eyebrow: string;
  headline: string;
  description: string;
  /**
   * Free quota heading, e.g. "10.000 request gratis setiap bulan".
   */
  freeQuotaTitle: string;
  /**
   * Free quota caption, e.g. "Kuota gratis untuk mencoba API Zonatic."
   */
  freeQuotaDescription: string;
  /**
   * Caption shown under the paid tiers that mentions high-volume pricing.
   */
  volumeNote: string;
  tiers: PricingTier[];
  advantages: PricingAdvantage[];
  /**
   * Main CTA label, e.g. "Lihat Dokumentasi".
   */
  cta: string;
  /**
   * Main CTA destination. Only routes that already work should be passed.
   */
  ctaHref: string;
};

export type Content = {
  locale: Locale;
  htmlLang: string;
  meta: {
    title: string;
    description: string;
    ogLocale: string;
    siteUrl: string;
    /**
     * Public origin of the Zonatic console. Used by every primary
     * product-start CTA on the landing page so the URL is defined once per
     * locale and never duplicated across components.
     */
    consoleUrl: string;
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
     * Rendered as `{headline} {headlineHighlight}`, with the accent on the
     * closing phrase so the sentence still reads as one thought.
     */
    headline: string;
    headlineHighlight: string;
    description: string;
    primaryCta: string;
    secondaryCta: string;
    /**
     * Statistics displayed below the hero CTAs.
     */
    stats: { label: string; value: string }[];
    /**
     * Alt text for the hero illustration showing Indonesia map.
     */
    imageAlt: string;
  };
  /**
   * Problem section: explains the pain point Zonatic solves.
   */
  problem: Problem;
  /**
   * Data Sources section: three trusted sources.
   */
  dataSources: DataSources;
  /**
   * Features section: four key feature cards.
   */
  features: Features;
  /**
   * API Example section: code tabs and response.
   */
  apiExample: ApiExample;
  /**
   * Use Cases section: examples of how customers may apply Zonatic.
   */
  useCases: {
    eyebrow: string;
    headline: string;
    description: string;
    cases: UseCase[];
    disclaimer: string;
  };
  /**
   * Final CTA section with Indonesia map background.
   */
  finalCta: {
    eyebrow: string;
    headline: string;
    description: string;
    primaryCta: string;
    secondaryCta: string;
  };
  pricing: Pricing;
  footer: {
    tagline: string;
    /**
     * Compact B2B infrastructure footer: product areas, developer
     * references, and company pages. Entries without an `href` render as
     * plain labels, never as dead links.
     */
    columns: FooterColumn[];
    /**
     * Rendered verbatim so the static HTML does not depend on the build
     * clock: `new Date().getFullYear()` can disagree between the prerender
     * and the browser across a year boundary.
     */
    copyrightYear: string;
    copyright: string;
  };
};