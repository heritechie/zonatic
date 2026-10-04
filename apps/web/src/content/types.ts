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
    | "target";
};

/**
 * A short capability line. Rendered as plain text, never as a card:
 * the page deliberately keeps one idea per section.
 */
export type Capability = {
  label: string;
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
     * Rendered as `{headline} {headlineHighlight}`, with the accent on the
     * closing phrase so the sentence still reads as one thought.
     */
    headline: string;
    headlineHighlight: string;
    description: string;
    primaryCta: string;
    secondaryCta: string;
    /**
     * Three plain-text capability markers under the CTAs. No icons and no
     * card chrome: they restate the product shape, not a feature list.
     */
    microRow: string[];
    /**
     * Alt text for `/assets/zonatic_hero_flat_green.webp`, the hero's
     * primary visual. The artwork carries its own labels, so the alt text
     * describes the illustration rather than repeating them.
     */
    imageAlt: string;
  };
  /**
   * "Bring your data, put it on the map." One section, one visual: the
   * enrichment artwork already contains the dataset -> process -> result
   * story, so the page adds only a plain-text reading order beside it.
   */
  dataToIntel: {
    eyebrow: string;
    headline: string;
    headlineHighlight: string;
    description: string;
    /** Reading order for the single visual, joined with arrows. No cards. */
    flowLabels: string[];
    /** Alt text for `/assets/zonatic_enrichment_section.webp`. */
    imageAlt: string;
  };
  /**
   * Zonas: administrative areas and custom polygons combined into reusable
   * business units. Replaces the old three-card territory layout, which
   * split one idea across three visuals.
   */
  zonas: {
    eyebrow: string;
    headline: string;
    description: string;
    /** Three capability lines shown in the copy column. */
    capabilities: Capability[];
    /** Alt text for `/assets/zonatic_zona_editor.webp`. */
    imageAlt: string;
  };
  /**
   * Zonatic's main differentiator: location in, business rule out.
   *
   * The section is deliberately *not* a documentation browser. It shows one
   * request, one response, and the rules a caller could derive from it,
   * framed by the LOCATION -> ZONE -> RULE -> DECISION chain.
   */
  api: {
    eyebrow: string;
    headline: string;
    description: string;
    /** The chain, rendered in order with connectors. */
    flow: string[];
    /** The single example request. */
    request: {
      method: string;
      path: string;
      label: string;
    };
    /** The single example response, shown verbatim as JSON. */
    response: {
      label: string;
      json: string;
    };
    /**
     * Example rules a caller could apply to the response above.
     * `zoneLabel` / `scoreLabel` are explicit rather than derived, so the
     * component never has to guess a locale from a string.
     */
    rules: {
      label: string;
      zoneLabel: string;
      zone: string;
      scoreLabel: string;
      score: string;
      items: { label: string; value: string; outcome: "positive" | "neutral" }[];
    };
    /**
     * States the boundary explicitly: Zonatic returns location context,
     * the customer's application applies its own business rules. This must
     * never be phrased as Zonatic making a credit or lending decision.
     */
    disclaimer: string;
  };
  useCases: {
    eyebrow: string;
    headline: string;
    description: string;
    cases: UseCase[];
    disclaimer: string;
  };
  /**
   * Location API cost estimator.
   *
   * Economic argument only: it estimates what a given volume costs on each
   * side. It makes no claim that a global provider is bad, and it does not
   * render the full Zonatic pricing table.
   */
  costEstimator: {
    eyebrow: string;
    headline: string;
    description: string;
    calculator: {
      title: string;
      productLabel: string;
      productHint: string;
      requestsLabel: string;
      requestsHint: string;
      /** Preset labels, e.g. `10K`. Order matches the preset values. */
      presets: string[];
      /**
       * Plan labels shown in the Zonatic result. Product option labels are
       * *not* here: they are proper nouns owned by the pricing data, so a
       * product can be added without touching copy or code.
       */
      plans: {
        planFree: string;
        planDeveloper: string;
        planGrowth: string;
        planBusiness: string;
      };
      /** Titled "estimated" because it is derived from volume, not quoted. */
      columnProvider: string;
      columnProviderNote: string;
      columnZonatic: string;
      columnZonaticNote: string;
      /**
       * Discloses that the provider figure covers one SKU only. `{sku}` and
       * `{product}` are replaced from the selected product at render time.
       */
      skuNote: string;
      /** Marks a figure as an estimate rather than a quoted price. */
      estimateBadge: string;
      perMonthSuffix: string;
      /** Shown when the volume lands on a negotiated plan. */
      customPlanLabel: string;
      /**
       * Headline for the comparison block.
       *
       * The block has three states and only one of them may claim savings, so
       * the wording is split rather than derived from the amount:
       *   - `savingsTitle` when the provider estimate is above Zonatic's;
       *   - `comparisonTitle` when they are equal, when Zonatic's is higher, or
       *     when no comparison could be made at all.
       */
      comparisonTitle: string;
      savingsTitle: string;
      /** `{provider}` and `{volume}` are replaced at render time. */
      savingsNote: string;
      /** Neutral wording for when Zonatic's estimate is the higher one. */
      higherNote: string;
      /** Shown when both sides come to the same figure. */
      equalNote: string;
      /** Shown when a comparison could not be computed. */
      comparisonUnavailable: string;
      /**
       * Unit for the request volume, e.g. `request/bulan`. Kept separate from
       * `perMonthSuffix` so a volume can never be rendered as if it were a
       * currency amount.
       */
      requestVolumeUnit: string;
      /** Discloses the exchange rate used to compare the two currencies. */
      rateNote: string;
      /**
       * Provenance line for the provider figure. `{date}` is replaced with
       * the pricing file's `checkedAt` value at render time.
       */
      sourceNote: string;
      emptyState: string;
      disclaimer: string;
    };
    explainer: {
      title: string;
      points: string[];
    };
    cta: {
      primary: string;
      secondary: string;
      /** Placeholder until the console's public origin is confirmed. */
      href: string;
    };
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