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
      "Understand locations, define territories, and build location-aware applications with geographic infrastructure for Indonesia.",
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
      { label: "Product", href: "#product" },
      { label: "Solutions", href: "#use-cases" },
      { label: "Pricing", href: "#pricing" },
      { label: "Documentation", href: "/docs" },
    ],
  },
  hero: {
    eyebrow: "LOCATION INTELLIGENCE FOR INDONESIA",
    headlineLine1: "Turn your location data",
    headlineLine2: "into",
    headlineHighlight: "real insights.",
    description:
      "Understand locations, define territories, and build location-aware applications with accurate, trusted Indonesian geographic data.",
    primaryCta: "Get started",
    secondaryCta: "View documentation",
    ctaFineprint:
      "No credit card required · Instant API access · Open documentation",
    pillars: [
      {
        label: "Location Data",
        description: "Addresses, coordinates, and your location data.",
        iconKey: "database",
      },
      {
        label: "Geographic Intelligence",
        description: "Enrich, classify, and understand your context.",
        iconKey: "globe",
      },
      {
        label: "Territory",
        description:
          "Build coverage from administrative areas or custom polygons.",
        iconKey: "map",
      },
      {
        label: "API",
        description:
          "Use location intelligence in your applications.",
        iconKey: "code",
      },
    ],
    map: {
      searchPlaceholder: "Search location...",
      zoomIn: "Zoom in",
      zoomOut: "Zoom out",
      reset: "Reset view",
      areaTitle: "Kebayoran Baru",
      areaCountLabel: "locations",
      summaryCard: {
        totalLabel: "locations shown",
        legend: [
          { label: "Customer", count: 2421, dotClass: "bg-emerald-600" },
          { label: "Outlet", count: 312, dotClass: "bg-emerald-300" },
          { label: "Other", count: 109, dotClass: "bg-slate-400" },
        ],
        disclaimer:
          "Illustrative numbers for design demonstration only.",
      },
    },
  },
  dataToIntel: {
    eyebrow: "FROM DATA TO LOCATION INTELLIGENCE",
    headline: "Bring your data.",
    headlineHighlight: "Put it on the map.",
    description:
      "Upload your customer, outlet, or other location data. Zonatic validates them, enriches them with Indonesian geography, then visualizes and analyzes them for you.",
    steps: [
      {
        title: "Upload your location data",
        description:
          "Use CSV, Excel, or an API integration to bring in your customers, outlets, or other point-of-interest data.",
        mockRows: [
          { id: "1", name: "Store A", address: "1 Sudirman St." },
          { id: "2", name: "Store B", address: "Gatot Subroto..." },
          { id: "3", name: "Store C", address: "Ahmad Yani St..." },
        ],
      },
      {
        title: "Zonatic resolves and enriches",
        description:
          "Get coordinates, administrative area, postal code, and location attribution for every record.",
        stats: {
          total: "12,431 records processed",
          items: [
            { label: "Address validation", iconKey: "check" },
            { label: "Location enrichment", iconKey: "check" },
            { label: "Area mapping", iconKey: "check" },
            { label: "Duplicate detection", iconKey: "check" },
          ],
        },
      },
      {
        title: "Visualize and analyze",
        description:
          "See your data on a map, analyze it for coverage, and surface the insights.",
        map: {
          areaName: "Analysis Area",
          insideLabel: "inside",
          outsideLabel: "outside",
        },
      },
    ],
  },
  territories: {
    eyebrow: "MANAGE AREAS WITH EASE",
    headline: "Define your territories.",
    description:
      "Create coverage using Indonesian administrative areas, or draw your own custom boundaries.",
    createCta: "Create a territory",
    ctaFootnote:
      "Demonstration on the landing page only — actual territory management lives in the Console.",
    cards: [
      {
        title: "Administrative Areas",
        description:
          "Pick provinces, cities, districts, or villages from the official Indonesia registry.",
      },
      {
        title: "Custom Polygons",
        description:
          "Draw the area yourself, or import an existing GeoJSON file.",
      },
      {
        title: "Combine and Manage",
        description:
          "Combine multiple administrative areas and custom polygons inside a single territory.",
      },
    ],
    cardHelpers: [
      "From official administrative areas",
      "From your own polygon",
      "Combine both into a single territory",
    ],
    polygonSupportedLabel: "GeoJSON / KML supported",
    adminTree: {
      label: "DKI Jakarta Province",
      children: {
        label: "Jakarta Pusat",
        grandchildren: [
          "Jakarta Pusat",
          "Jakarta Utara",
          "Jakarta Selatan",
          "Jakarta Timur",
        ],
      },
    },
    summary: {
      areaName: "Territory Area (3)",
      badge: "Active",
      areasLabel: "areas",
      locationsLabel: "locations",
      items: [
        { name: "Jakarta Pusat", count: 128 },
        { name: "Jakarta Selatan", count: 342 },
        { name: "Custom Area 1", count: 76 },
      ],
    },
  },
  api: {
    eyebrow: "FOR DEVELOPERS",
    headline: "Built for your applications.",
    description:
      "Use Zonatic APIs to resolve locations, check territories, and bring location intelligence into your applications.",
    viewDocs: "View documentation",
    tryPlayground: "Try in Playground",
    placeholderNote:
      "The endpoints below are the ones actually live in Zonatic right now.",
    codeTabs: [
      {
        label: "cURL",
        language: "bash",
        code: `# Reverse geocode
curl -X GET "https://api.zonatic.id/v1/reverse-geocode?latitude=-6.2088&longitude=106.8456" \\
  -H "Authorization: Bearer YOUR_API_KEY"

{
  "latitude": -6.2088,
  "longitude": 106.8456,
  "matched": true,
  "address": {
    "province":    "DKI Jakarta",
    "city":        "Jakarta Pusat",
    "district":    "Tanah Abang",
    "postal_code": "10220"
  },
  "areas": [...]
}`,
      },
      {
        label: "JavaScript",
        language: "javascript",
        code: `const res = await fetch(
  "https://api.zonatic.id/v1/reverse-geocode?latitude=-6.2088&longitude=106.8456",
  {
    headers: { Authorization: "Bearer YOUR_API_KEY" }
  }
);
const data = await res.json();
console.log(data.address.city); // Jakarta Pusat`,
      },
      {
        label: "Python",
        language: "python",
        code: `import requests

res = requests.get(
    "https://api.zonatic.id/v1/reverse-geocode",
    params={"latitude": -6.2088, "longitude": 106.8456},
    headers={"Authorization": "Bearer YOUR_API_KEY"},
)
data = res.json()
print(data["address"]["city"])  # Jakarta Pusat`,
      },
    ],
    endpointListTitle: "Popular endpoints",
    endpointListDescription:
      "The endpoints most teams reach for first when integrating Zonatic.",
    endpointListItems: [
      { method: "GET", path: "/v1/reverse-geocode", auth: false },
      { method: "GET", path: "/v1/areas/search", auth: true },
      { method: "GET", path: "/v1/areas/autocomplete", auth: false },
      { method: "GET", path: "/v1/postal-codes/search", auth: true },
    ],
    seeAllCta: "See all endpoints",
  },
  useCases: {
    eyebrow: "BUILT FOR REAL-WORLD TEAMS",
    headline: "Location intelligence across industries.",
    description:
      "Help teams across industries make better decisions with location intelligence.",
    disclaimer:
      "Zonatic is not a collection-management, sales, CRM, logistics, or insurance product. It provides the geographic infrastructure those products can build on.",
    cases: [
      {
        title: "Collection & Lending",
        description:
          "Map customers, define collection areas, and improve field efficiency.",
        iconKey: "coins",
      },
      {
        title: "Sales & Distribution",
        description:
          "Plan territories, map outlets, and organize coverage.",
        iconKey: "store",
      },
      {
        title: "Service Operations",
        description:
          "Define service areas and manage field operations.",
        iconKey: "wrench",
      },
      {
        title: "Insurance",
        description:
          "Understand risk areas and manage branch coverage.",
        iconKey: "shield-check",
      },
      {
        title: "Retail & FMCG",
        description:
          "Map outlets, plan distribution, and analyze market reach.",
        iconKey: "shopping-basket",
      },
      {
        title: "Logistics",
        description:
          "Define delivery areas and optimize coverage.",
        iconKey: "truck",
      },
    ],
  },
  finalCta: {
    eyebrow: "GET STARTED TODAY",
    headline: "Make your data location-aware.",
    description:
      "Build smarter products with geographic infrastructure designed for Indonesia.",
    primaryCta: "Get started",
    secondaryCta: "Contact sales",
  },
  footer: {
    tagline: "Location intelligence infrastructure for Indonesia.",
    copyright: "All rights reserved.",
    jurisdiction: "Location intelligence infrastructure for Indonesia.",
    legalLinks: ["Privacy Policy", "Terms of Service"],
    socials: [
      {
        label: "GitHub",
        href: "https://github.com/heritechie/zonatic",
        iconKey: "github",
      },
      {
        label: "LinkedIn",
        href: "https://www.linkedin.com/company/zonatic",
        iconKey: "linkedin",
      },
    ],
    columns: [
      {
        title: "Product",
        links: [
          { label: "Location Intelligence", href: "#hero" },
          { label: "Territory", href: "#territories" },
          { label: "Location Data", href: "#data" },
          { label: "API", href: "#api" },
        ],
      },
      {
        title: "Solutions",
        links: [
          { label: "Enterprise", href: "#use-cases" },
          { label: "Startup", href: "#use-cases" },
          { label: "Developer", href: "#use-cases" },
          { label: "Field Operations", href: "#use-cases" },
        ],
      },
      {
        title: "Documentation",
        links: [
          { label: "Enterprise", href: "/docs" },
          { label: "About", href: "/about" },
          { label: "API Reference", href: "/docs" },
          { label: "Examples", href: "/docs" },
        ],
      },
      {
        title: "Company",
        links: [
          { label: "About", href: "/about" },
          { label: "Privacy Policy", href: "/privacy" },
          { label: "Terms of Service", href: "/terms" },
        ],
      },
    ],
  },
};