import type { Content } from "./types";

/**
 * English content for the Zonatic landing page.
 *
 * Mirrors the structure of `id.ts` exactly. Every user-facing string on
 * the landing page resolves through this tree at build time.
 */
export const en: Content = {
  locale: "en",
  htmlLang: "en",
  meta: {
    title: "Zonatic — Location Intelligence Infrastructure for Indonesia",
    description:
      "Understand location context in Indonesia, define zonas, and use geographic data directly in your application.",
    ogLocale: "en_ID",
    siteUrl: "https://www.zonatic.id",
  },
  common: {
    skipToContent: "Skip to content",
    signIn: "Sign in",
    getStarted: "Get started",
    viewDocumentation: "View documentation",
    placeholderRouteNote:
      "Placeholder routes will return to the dashboard once the docs and playground are published.",
    illustrativeNumbers:
      "Illustrative numbers for design demonstration only.",
    stepLabels: ["", "Step 1", "Step 2", "Step 3", "Step 4"],
    notFoundHeading: "Page not found",
    notFoundBody:
      "The page you are looking for does not exist or has been moved.",
    notFoundCta: "Back to home",
  },
  nav: {
    brand: "Zonatic",
    signIn: "Sign in",
    getStarted: "Get started",
    mobileOpen: "Open menu",
    mobileClose: "Close menu",
    links: [
      { label: "Product", href: "#zonas" },
      { label: "Solutions", href: "#use-cases" },
      { label: "Pricing", href: "#cost" },
    ],
  },
  hero: {
    eyebrow: "LOCATION INTELLIGENCE FOR INDONESIA",
    headline: "Turn your location data into",
    headlineHighlight: "real insight.",
    description:
      "Understand location context, define zonas, and use geographic data directly in your application.",
    primaryCta: "Try Zonatic",
    secondaryCta: "View API documentation",
    microRow: [
      "Indonesian location data",
      "Zonas",
      "API & location rules",
    ],
    imageAlt:
      "Flat Zonatic illustration: Indonesian location data mapped into zonas and geographic context used by an application.",
  },
  dataToIntel: {
    eyebrow: "LOCATION DATA",
    headline: "Bring your data.",
    headlineHighlight: "Put it on the map.",
    description:
      "Use location data you already have to understand its geographic context, see distribution patterns, and group locations to fit your needs.",
    flowLabels: ["Dataset", "Enrichment process", "Location result"],
    imageAlt:
      "Zonatic enrichment flow illustration: a location dataset processed into a location result ready to analyse.",
  },
  zonas: {
    eyebrow: "ZONAS",
    headline: "Define zonas that fit your business.",
    description:
      "Combine administrative areas or custom polygons into zonas you can reuse for analysis, operations, and location-based rules.",
    capabilities: [
      {
        label: "Administrative areas",
        description: "Pick a province, city, district, or village.",
      },
      {
        label: "Custom zonas",
        description: "Use polygons shaped to your need.",
      },
      {
        label: "Reusable zonas",
        description: "Use the same zona for analysis and location-based rules.",
      },
    ],
    imageAlt:
      "Zonatic zona editor illustration: administrative areas combined with a custom polygon into one zona.",
  },
  api: {
    eyebrow: "API & LOCATION RULES",
    headline: "Make location context part of your business rules.",
    description:
      "Use location primitives to build applications, or define location-based rules through the UI and consume the results through the API.",
    flow: ["LOCATION", "ZONATIC API", "ZONA", "RULE", "RESULT"],
    request: {
      method: "GET",
      path: "/v1/zones/lookup?lat=-6.2088&lng=106.8456",
      label: "Request",
    },
    response: {
      label: "Response",
      json: `{
  "zone_id": "ID-JK-3171",
  "zone": "urban",
  "score": 20,
  "rules": [
    "rule_a",
    "rule_b",
    "rule_c"
  ]
}`,
    },
    rules: {
      label: "Example rules from that response",
      zoneLabel: "Zone",
      zone: "Urban",
      scoreLabel: "Score",
      score: "+20",
      items: [
        { label: "Rule A", value: "matched", outcome: "positive" },
        { label: "Rule B", value: "priority", outcome: "positive" },
        { label: "Rule C", value: "applicable", outcome: "neutral" },
      ],
    },
    disclaimer:
      "Zonatic provides location and zona context. Business rules and decisions stay with your own application.",
  },
  useCases: {
    eyebrow: "USE CASES",
    headline: "Location intelligence across industries.",
    description:
      "Use location data, zonas, and location-based rules to fit your business needs.",
    cases: [
      {
        title: "Lending & Finance",
        description: "Rules, eligibility, and location-based analysis.",
        iconKey: "coins",
      },
      {
        title: "Retail",
        description: "Area analysis and expansion potential.",
        iconKey: "store",
      },
      {
        title: "Logistics",
        description: "Service zonas and coverage areas.",
        iconKey: "truck",
      },
      {
        title: "Marketing",
        description: "Segmentation and targeting by area.",
        iconKey: "target",
      },
    ],
    disclaimer:
      "The use cases above are examples of customer application, not Zonatic's feature scope.",
  },
  costEstimator: {
    eyebrow: "LOCATION API COST",
    headline: "Paying too much for location data?",
    description:
      "Use Indonesian location data with a more efficient approach.",
    calculator: {
      title: "Estimate your location API cost",
      productLabel: "Location service",
      productHint: "Pick the location service you call most often.",
      requestsLabel: "Monthly requests",
      requestsHint: "Use a preset or enter your own volume.",
      presets: ["10K", "100K", "1M", "5M", "10M"],
      plans: {
        planFree: "Free",
        planDeveloper: "Developer",
        planGrowth: "Growth",
        planBusiness: "Business",
      },
      columnProvider: "Estimated Google cost",
      columnProviderNote: "Derived from monthly volume",
      columnZonatic: "Zonatic",
      columnZonaticNote: "Derived from plan",
      skuNote:
        "Google pricing varies by SKU and requested fields. This estimate uses {product}.",
      rateNote:
        "The comparison is converted at an assumed rate, not a live exchange rate.",
      estimateBadge: "Estimate",
      perMonthSuffix: "/month",
      customPlanLabel: "Custom plan",
      comparisonTitle: "Cost comparison",
      savingsTitle: "Potential savings",
      savingsNote: "Compared with the estimated {provider} cost at {volume}.",
      higherNote: "The estimated {provider} cost is lower at {volume}.",
      equalNote: "Estimated cost is equal",
      comparisonUnavailable:
        "The cost comparison cannot be calculated for this volume.",
      requestVolumeUnit: "requests/month",
      sourceNote: "Provider pricing checked {date}.",
      emptyState:
        "Enter your monthly request volume to see an estimated cost.",
      disclaimer:
        "Estimates are based on usage volume. Actual prices may differ by SKU, requested fields, volume tier, and usage configuration. Zonatic pricing shown here is still an internal hypothesis, not final pricing.",
    },
    explainer: {
      title: "Zonatic is an additional layer, not a replacement.",
      points: [
        "Using Zonatic does not mean you have to leave your global provider.",
        "Keep a global provider for the needs that genuinely require coverage, Places, or other services Zonatic does not provide.",
        "For Indonesian location resolution that local data can already answer, Zonatic can be a more efficient layer.",
      ],
    },
    cta: {
      primary: "Try Zonatic",
      secondary: "Start with your Indonesian location needs.",
      href: "mailto:hello@zonatic.id",
    },
  },
  finalCta: {
    eyebrow: "ZONE · RULE · API",
    headline: "Make your data more meaningful.",
    description:
      "Understand location context, shape zonas, and use geographic information directly in your application.",
    primaryCta: "Start with Zonatic",
    secondaryCta: "View API documentation",
  },
  footer: {
    tagline: "Location intelligence infrastructure for Indonesia.",
    copyrightYear: "2026",
    copyright: "All rights reserved.",
    columns: [
      {
        title: "Product",
        links: [
          { label: "Location Intelligence" },
          { label: "Zonas" },
          { label: "API" },
        ],
      },
      {
        title: "Developer",
        links: [
          { label: "API Documentation" },
          { label: "API Reference" },
        ],
      },
      {
        title: "Company",
        links: [
          { label: "About Zonatic", href: "/about" },
          { label: "Contact", href: "mailto:hello@zonatic.id" },
        ],
      },
    ],
  },
};
