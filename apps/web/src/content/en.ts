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
    title: "Zonatic — Location API for Indonesia",
    description:
      "Access Indonesian administrative boundaries, postal codes, and location data through a single API. Fast, accurate, and ready to use.",
    ogLocale: "en_ID",
    siteUrl: "https://www.zonatic.id",
    consoleUrl: "https://console.zonatic.id",
  },
  common: {
    skipToContent: "Skip to content",
    signIn: "Sign in",
    getStarted: "Start Integration",
    viewDocumentation: "View Documentation",
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
    getStarted: "Start Integration",
    mobileOpen: "Open menu",
    mobileClose: "Close menu",
    links: [
      { label: "Features", href: "#features" },
      { label: "Data", href: "#data-sources" },
      { label: "Use Case", href: "#use-cases" },
      { label: "Documentation", href: "/docs" },
      { label: "Pricing", href: "#pricing" },
    ],
  },
  hero: {
    eyebrow: "LOCATION API FOR INDONESIA",
    headline: "Indonesian location data,",
    headlineHighlight: "ready for your application.",
    description:
      "Access Indonesian administrative boundaries, postal codes, and location data through a single API that is fast, accurate, and ready to use.",
    primaryCta: "Start Integration",
    secondaryCta: "Explore Data",
    stats: [
      { label: "Provinces", value: "38" },
      { label: "Regencies/Cities", value: "514" },
      { label: "Districts", value: "7,285" },
      { label: "Villages/Wards", value: "83,762" },
    ],
    imageAlt:
      "Map of Indonesia with administrative boundaries displayed over a navy background.",
  },
  problem: {
    eyebrow: "PROBLEM SOLVED",
    headline: "Location data shouldn't be a burden for every developer.",
    description:
      "Collecting Indonesian administrative boundary datasets, assembling the province–regency–district–village hierarchy, linking postal codes to areas, and maintaining data consistency requires significant time and cost. Zonatic eliminates this complexity by providing standardized Indonesian location data through a single API.",
    imageAlt:
      "Visualization of GPS coordinates, administrative boundaries, and postal codes connected in one integrated system.",
  },
  dataSources: {
    eyebrow: "DATA SOURCES",
    headline: "From trusted data sources.",
    description:
      "Zonatic builds location data from official, verifiable sources — not from unverified community data.",
    sources: [
      {
        title: "Administrative Boundary Data",
        description:
          "Province, regency/city, district, and village/ward boundaries from official Ministry of Home Affairs (Kemendagri) data via region-id.",
        iconKey: "map",
        verified: true,
      },
      {
        title: "Indonesian Postal Code Data",
        description:
          "Indonesian postal codes from Pos Indonesia mapped to administrative areas via postal-code-id.",
        iconKey: "mail",
        verified: true,
      },
      {
        title: "Geographic Information",
        description:
          "Boundary coordinates, area centroids, and geographic metadata to support reverse geocoding and spatial analysis.",
        iconKey: "globe",
        verified: true,
      },
    ],
  },
  features: {
    eyebrow: "KEY FEATURES",
    headline: "One API. Diverse needs.",
    description:
      "Zonatic provides a complete location data foundation for building location-based applications in Indonesia.",
    features: [
      {
        title: "Administrative Boundary Data",
        description:
          "Access the complete Indonesian administrative hierarchy: 38 provinces, 514 regencies/cities, 7,285 districts, and 83,762 villages/wards with stable canonical codes.",
        iconKey: "map",
      },
      {
        title: "Indonesian Postal Codes",
        description:
          "Postal code lookup by area or coordinates, with many-to-many relationships to administrative boundaries for maximum accuracy.",
        iconKey: "mail",
      },
      {
        title: "Reverse Geocoding",
        description:
          "Convert GPS coordinates (latitude/longitude) into complete administrative context: province, regency/city, district, and village/ward.",
        iconKey: "navigation",
      },
      {
        title: "Developer Friendly",
        description:
          "REST API with OpenAPI documentation, SDKs for multiple languages, < 100ms response time, and 99.9% uptime.",
        iconKey: "code",
      },
    ],
  },
  apiExample: {
    eyebrow: "API EXAMPLE",
    headline: "Integration in minutes.",
    description:
      "Simple REST API with standard JSON responses. Full documentation available in the developer portal.",
    tabs: [
      {
        label: "cURL",
        code: `curl -H "Authorization: Bearer ZN_API_KEY" \\
  "https://api.zonatic.id/v1/reverse-geocode?latitude=-6.19&longitude=106.81"`,
      },
      {
        label: "JavaScript",
        code: `const response = await fetch(
  "https://api.zonatic.id/v1/reverse-geocode?latitude=-6.19&longitude=106.81",
  {
    headers: {
      "Authorization": "Bearer ZN_API_KEY",
      "Content-Type": "application/json"
    }
  }
);
const data = await response.json();`,
      },
      {
        label: "Python",
        code: `import requests

response = requests.get(
    "https://api.zonatic.id/v1/reverse-geocode",
    params={"latitude": -6.19, "longitude": 106.81},
    headers={"Authorization": "Bearer ZN_API_KEY"}
)
data = response.json()`,
      },
    ],
    response: {
      label: "Response",
      json: `{
  "latitude": -6.19,
  "longitude": 106.81,
  "matched": true,
  "address": {
    "province": {
      "code": "31",
      "name": "DKI Jakarta",
      "level": 1
    },
    "regency_or_city": {
      "code": "3171",
      "name": "Central Jakarta Administrative City",
      "level": 2
    },
    "district": {
      "code": "317101",
      "name": "Gambir District",
      "level": 3
    },
    "village_or_ward": {
      "code": "3171011001",
      "name": "Gambir Village",
      "level": 4
    }
  },
  "areas": [
    {"code": "31", "name": "DKI Jakarta", "level": "province"},
    {"code": "3171", "name": "Central Jakarta Administrative City", "level": "regency"},
    {"code": "317101", "name": "Gambir District", "level": "district"},
    {"code": "3171011001", "name": "Gambir Village", "level": "village"}
  ]
}`,
    },
  },
  useCases: {
    eyebrow: "USE CASE",
    headline: "Supporting various application types.",
    description:
      "Zonatic supports various industries that require accurate and standardized Indonesian location data.",
    cases: [
      {
        title: "E-commerce",
        description:
          "Shipping address validation, automatic shipping cost calculation, and service area coverage checking based on postal codes and administrative boundaries.",
        iconKey: "shopping-cart",
      },
      {
        title: "On-Demand Services",
        description:
          "Driver/courier matching with orders based on zones, service area validation, and travel time estimation based on administrative boundaries.",
        iconKey: "navigation",
      },
      {
        title: "Analytics & Research",
        description:
          "Demographic analysis per area, population density mapping, postal-code-based market analysis, and spatial data visualization.",
        iconKey: "bar-chart",
      },
      {
        title: "Internal Systems",
        description:
          "Branch/outlet master location data validation, operational zone management, and CRM/ERP integration with location-based data.",
        iconKey: "building",
      },
    ],
    disclaimer:
      "The use cases above are examples of potential applications, not a guarantee of features provided directly by Zonatic.",
  },
  finalCta: {
    eyebrow: "LOCATION API FOR INDONESIA",
    headline: "Build your application with Indonesian location data.",
    description:
      "Start integrating today and access Indonesian administrative boundaries, postal codes, and location data through a single API that is fast and reliable.",
    primaryCta: "Start Integration",
    secondaryCta: "View Documentation",
  },
  footer: {
    tagline: "Location API for Indonesia.",
    copyrightYear: "2026",
    copyright: "All rights reserved.",
    columns: [
      {
        title: "Product",
        links: [
          { label: "Administrative Boundary Data" },
          { label: "Indonesian Postal Codes" },
          { label: "Reverse Geocoding" },
          { label: "Developer Tools" },
        ],
      },
      {
        title: "Developer",
        links: [
          { label: "API Documentation", href: "/docs" },
          { label: "API Reference" },
          { label: "Changelog" },
        ],
      },
      {
        title: "Legal",
        links: [
          { label: "Terms of Service", href: "/terms" },
          { label: "Privacy Policy", href: "/privacy" },
        ],
      },
    ],
  },
};