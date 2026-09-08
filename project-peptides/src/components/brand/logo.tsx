import { cn } from "@/lib/utils";

/** Project Peptides mark — an abstract helix/node glyph. Original artwork. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-7", className)} fill="none" aria-hidden>
      <rect width="32" height="32" rx="8" fill="hsl(var(--primary))" />
      <path
        d="M10 9c0 4 12 6 12 10M22 9c0 4-12 6-12 10"
        stroke="hsl(var(--primary-foreground))"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="10" cy="9" r="1.7" fill="hsl(var(--primary-foreground))" />
      <circle cx="22" cy="9" r="1.7" fill="hsl(var(--primary-foreground))" />
      <circle cx="10" cy="23" r="1.7" fill="hsl(var(--primary-foreground))" />
      <circle cx="22" cy="23" r="1.7" fill="hsl(var(--primary-foreground))" />
    </svg>
  );
}

export function Logo({ className, subtle }: { className?: string; subtle?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark />
      <span className="flex flex-col leading-none">
        <span className="text-[15px] font-semibold tracking-tight text-foreground">
          Project Peptides
        </span>
        {!subtle && (
          <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Clinic Operating System
          </span>
        )}
      </span>
    </span>
  );
}
