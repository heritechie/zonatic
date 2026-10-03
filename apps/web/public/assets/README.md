# Public assets

Brand-approved static assets used by the landing page.

## Layout

```
assets/
├── brand/    # Logo and wordmark (PNG / WebP)
├── maps/     # Hero map illustration, Indonesia contour
├── workflow/ # Data-to-location preview images
├── territory/# Territory card illustrations
└── social/   # Open Graph share image
```

## Files

| Path | Format | Dimensions | Used for |
|------|--------|------------|----------|
| `brand/zonatic-logo-full.png` | PNG (RGBA) | 2172 × 724 | Footer / fallback |
| `brand/zonatic-logo-full.webp` | WebP | — | Footer / fallback |
| `maps/customer-location-map.webp` | WebP | 1672 × 941 | Data-to-location step 3 fallback |
| `maps/hero-jakarta-map.webp` | WebP | — | Hero map fallback |
| `maps/indonesia-contour.webp` | WebP | — | Final CTA background fallback |
| `workflow/dataset-preview.webp` | WebP | — | Data-to-location step 1 fallback |
| `workflow/enrichment-preview.webp` | WebP | — | Data-to-location step 2 fallback |
| `territory/territory-polygon.webp` | WebP | — | Territory card 2 fallback |
| `territory/territory-summary.webp` | WebP | — | Territory card 3 fallback |
| `social/og-image.webp` | WebP | 1200 × 630 | Open Graph share image |

Every component renders an inline SVG equivalent when the
corresponding file is unavailable, so the build never fails on
missing assets.