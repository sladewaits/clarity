import { cn } from "@/lib/utils";

/**
 * Project Peptides — BrandLogo
 * =============================================================================
 * Reusable brand lockup supporting:
 *   • variant:  "horizontal" | "stacked" | "monogram"
 *   • tone:     "dark-on-light" | "white-on-petrol"
 *   • size:     configurable (symbol height in px; wordmark scales from it)
 *   • label:    accessible name (role="img" + aria-label)
 *
 * Wordmark treatment (per brand guide):
 *   PROJECT  — lighter weight, spaced uppercase
 *   PEPTIDES — bold uppercase, beneath PROJECT
 *
 * ⚠️ LOGO SYMBOL ASSET DEPENDENCY
 * -----------------------------------------------------------------------------
 * The approved *interlocking double-P* monogram artwork was NOT provided and
 * does not exist in the repository, so it could not be traced. The symbol
 * rendered here is an INTERIM PLACEHOLDER — it is deliberately NOT a claim to
 * match the approved monogram.
 *
 * To adopt the approved mark (one change, no other edits needed):
 *   1. Add the approved SVGs to /public/brand/:
 *        pp-symbol.svg         (dark-on-light: petrol/teal on transparent)
 *        pp-symbol-white.svg   (white-on-petrol: white/teal on transparent)
 *   2. Set APPROVED_SYMBOL_AVAILABLE = true below.
 * BrandSymbol then renders the approved artwork everywhere the logo appears.
 */

export const APPROVED_SYMBOL_AVAILABLE = false;

type BrandVariant = "horizontal" | "stacked" | "monogram";
type BrandTone = "dark-on-light" | "white-on-petrol";

interface BrandLogoProps {
  variant?: BrandVariant;
  tone?: BrandTone;
  size?: number;
  label?: string;
  showTagline?: boolean;
  className?: string;
}

/** The brand symbol. Approved artwork when available; interim mark otherwise. */
export function BrandSymbol({
  size = 32,
  tone = "dark-on-light",
  className,
}: {
  size?: number;
  tone?: BrandTone;
  className?: string;
}) {
  if (APPROVED_SYMBOL_AVAILABLE) {
    const src = tone === "white-on-petrol" ? "/brand/pp-symbol-white.svg" : "/brand/pp-symbol.svg";
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" width={size} height={size} className={cn("shrink-0", className)} />;
  }

  // --- INTERIM PLACEHOLDER (not the approved interlocking-PP monogram) -------
  const onPetrol = tone === "white-on-petrol";
  const tile = onPetrol ? "#0B2E40" : "#0F3B52"; // Deep Petrol
  const teal = "#00C2B3"; // Clinical Teal
  const light = onPetrol ? "#E6F7F5" : "#FBF6F2"; // aqua/mineral
  return (
    <svg
      viewBox="0 0 40 40"
      width={size}
      height={size}
      className={cn("shrink-0", className)}
      aria-hidden="true"
      focusable="false"
    >
      <rect x="0.5" y="0.5" width="39" height="39" rx="10" fill={tile} />
      {/* abstract interim mark — two offset rounded strokes; replaced by approved art */}
      <path
        d="M13 11.5h5.4a5.6 5.6 0 0 1 0 11.2H16v6.3"
        fill="none"
        stroke={light}
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M22 11.5h4.4a5.6 5.6 0 0 1 0 11.2H24v6.3"
        fill="none"
        stroke={teal}
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Wordmark({
  tone,
  size,
  align = "start",
}: {
  tone: BrandTone;
  size: number;
  align?: "start" | "center";
}) {
  const onPetrol = tone === "white-on-petrol";
  const projectColor = onPetrol ? "text-white/75" : "text-primary/70";
  const peptidesColor = onPetrol ? "text-white" : "text-primary";
  // scale type from the symbol size
  const projectPx = Math.max(8, Math.round(size * 0.3));
  const peptidesPx = Math.max(11, Math.round(size * 0.46));
  return (
    <span className={cn("flex flex-col leading-none", align === "center" && "items-center")}>
      <span
        className={cn("font-medium uppercase", projectColor)}
        style={{ fontSize: projectPx, letterSpacing: "0.32em", lineHeight: 1.1 }}
      >
        Project
      </span>
      <span
        className={cn("font-bold uppercase", peptidesColor)}
        style={{ fontSize: peptidesPx, letterSpacing: "0.06em", lineHeight: 1.05, marginTop: size * 0.05 }}
      >
        Peptides
      </span>
    </span>
  );
}

export function BrandLogo({
  variant = "horizontal",
  tone = "dark-on-light",
  size = 32,
  label = "Project Peptides",
  showTagline = false,
  className,
}: BrandLogoProps) {
  const onPetrol = tone === "white-on-petrol";

  if (variant === "monogram") {
    return (
      <span role="img" aria-label={label} className={cn("inline-flex", className)}>
        <BrandSymbol size={size} tone={tone} />
      </span>
    );
  }

  const tagline = showTagline ? (
    <span
      className={cn(
        "mt-1 text-[10px] font-medium uppercase tracking-[0.14em]",
        onPetrol ? "text-white/55" : "text-muted-foreground",
      )}
    >
      Modern specialty care
    </span>
  ) : null;

  if (variant === "stacked") {
    return (
      <span role="img" aria-label={label} className={cn("inline-flex flex-col items-center gap-2", className)}>
        <BrandSymbol size={size} tone={tone} />
        <Wordmark tone={tone} size={size} align="center" />
        {tagline}
      </span>
    );
  }

  // horizontal
  return (
    <span role="img" aria-label={label} className={cn("inline-flex items-center", className)} style={{ gap: size * 0.34 }}>
      <BrandSymbol size={size} tone={tone} />
      <span className="flex flex-col">
        <Wordmark tone={tone} size={size} />
        {tagline}
      </span>
    </span>
  );
}
