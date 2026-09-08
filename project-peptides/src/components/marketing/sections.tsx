import Link from "next/link";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export function Section({ className, children }: { className?: string; children: React.ReactNode }) {
  return <section className={cn("mx-auto max-w-7xl px-4 sm:px-6 lg:px-8", className)}>{children}</section>;
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">{children}</p>;
}

export function SectionHeading({ eyebrow, title, subtitle, center }: { eyebrow?: string; title: string; subtitle?: string; center?: boolean }) {
  return (
    <div className={cn("max-w-2xl", center && "mx-auto text-center")}>
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h2 className="mt-3 font-serif text-3xl font-semibold tracking-tight text-primary sm:text-4xl text-balance">{title}</h2>
      {subtitle && <p className="mt-4 text-lg text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

export function PageHero({ eyebrow, title, subtitle, cta }: { eyebrow: string; title: React.ReactNode; subtitle: string; cta?: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden border-b border-border">
      <div className="grain absolute inset-0 opacity-60" />
      <Section className="relative py-20 sm:py-28">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1 className="mt-4 max-w-3xl font-serif text-4xl font-semibold tracking-tight text-primary sm:text-5xl text-balance">{title}</h1>
        <p className="mt-5 max-w-2xl text-lg text-muted-foreground">{subtitle}</p>
        {cta && <div className="mt-8 flex flex-wrap gap-3">{cta}</div>}
      </Section>
    </div>
  );
}

export function FeatureCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-subtle transition-all hover:shadow-card">
      <div className="flex size-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">{icon}</div>
      <h3 className="mt-4 text-base font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{children}</p>
    </div>
  );
}

export function StatStrip({ items }: { items: { value: string; label: string }[] }) {
  return (
    <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
      {items.map((s) => (
        <div key={s.label}>
          <p className="text-3xl font-semibold tracking-tight text-foreground">{s.value}</p>
          <p className="mt-1 text-sm text-muted-foreground">{s.label}</p>
        </div>
      ))}
    </div>
  );
}

export function CTASection() {
  return (
    <Section className="py-20">
      <div className="relative overflow-hidden rounded-3xl bg-primary px-8 py-16 text-center text-primary-foreground sm:px-16">
        <div className="grain absolute inset-0 opacity-20" />
        <div className="relative">
          <Badge className="border border-white/20 bg-white/10 text-primary-foreground">Book a Demo</Badge>
          <h2 className="mx-auto mt-5 max-w-2xl font-serif text-3xl font-semibold tracking-tight sm:text-4xl text-balance">
            See how Project Peptides runs your entire program.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-primary-foreground/75">
            A guided walkthrough of pharmacy connectivity, program operations, education, fulfillment, and analytics — tailored to your clinic.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/book-demo" className="rounded-lg bg-accent-strong px-6 py-3 text-sm font-semibold text-accent-strong-foreground transition-transform hover:scale-[1.02]">Book a Demo</Link>
            <Link href="/app" className="rounded-lg border border-white/30 px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-white/10">Explore the Platform</Link>
          </div>
        </div>
      </div>
    </Section>
  );
}
