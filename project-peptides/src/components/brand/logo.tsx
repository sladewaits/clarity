/**
 * Back-compat shim. The canonical component is BrandLogo (./brand-logo).
 * Existing call sites used <Logo /> and <LogoMark />; these delegate so
 * nothing breaks. New code should import BrandLogo / BrandSymbol directly.
 */
import { BrandLogo, BrandSymbol } from "./brand-logo";

export { BrandLogo, BrandSymbol } from "./brand-logo";

export function Logo({ className, subtle }: { className?: string; subtle?: boolean }) {
  return (
    <BrandLogo
      variant="horizontal"
      tone="dark-on-light"
      size={30}
      showTagline={!subtle}
      className={className}
    />
  );
}

export function LogoMark({ className }: { className?: string }) {
  return <BrandSymbol size={28} className={className} />;
}
