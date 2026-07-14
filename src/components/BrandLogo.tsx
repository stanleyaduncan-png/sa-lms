// TODO(brand): replace with the real SVG lockup once supplied by the brand
// owner (public/brand/logo-full.svg + logo-full-reversed.svg + logo-mark.svg
// per EPIC-8 Task 3). Until then this text-based lockup keeps the layout and
// contrast rules correct.

export default function BrandLogo({
  variant = "default",
  className = "",
}: {
  variant?: "default" | "reversed";
  className?: string;
}) {
  // Gold is a fill/accent colour only — it is never used as text on a light
  // background (1.83:1, fails contrast). It's only legible as text on navy
  // (9.84:1), so the "default" (light-bg) variant stays navy throughout.
  const isReversed = variant === "reversed";
  return (
    <span className={`inline-flex items-baseline gap-1 font-bold tracking-wide ${className}`}>
      <span className={isReversed ? "text-white" : "text-navy-900"}>SHEQ</span>
      <span className={isReversed ? "text-gold-500" : "text-navy-900"}>PARTNER</span>
    </span>
  );
}
