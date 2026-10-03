import { cn } from "@/lib/utils";

/**
 * Brand lockup rendered from the approved raster asset
 * (`/assets/brand/zonatic-logo-full.webp`) rather than an inline SVG
 * so the navbar and footer always ship the exact approved artwork.
 *
 * The source file is 2172×724 with transparent padding baked in —
 * the visible ink occupies ~79% of the width and ~67% of the height.
 * Callers therefore size the element generously (`h-9`/`h-10`) so the
 * *visible* mark lands at roughly 24–27px. Do not crop the box with
 * `object-cover`; the padding is what keeps the lockup optically
 * aligned next to text.
 *
 * The asset carries the wordmark, so no adjacent brand text is needed.
 */
export function BrandLogo({
  className,
  priority = false,
}: {
  className?: string;
  priority?: boolean;
}) {
  return (
    /* Plain <img> because the app is a static export and the asset is
       served verbatim from /public; next/image would require measured
       layout at build time. */
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/assets/brand/zonatic-logo-full.webp"
      alt="Zonatic"
      width={2172}
      height={724}
      className={cn("w-auto object-contain", className)}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
    />
  );
}