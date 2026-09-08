import Link from "next/link";
import {
  ArrowRight, Building2, GraduationCap, LayoutGrid, BarChart3, MapPin,
  LifeBuoy, Boxes, Stethoscope,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Section, SectionHeading, StatStrip, CTASection, Eyebrow } from "@/components/marketing/sections";
import { Reveal } from "@/components/marketing/reveal";

const MODULES = [
  { icon: <Building2 className="size-5" />, title: "Pharmacy connectivity", body: "One interface across every 503A and 503B relationship — pricing, availability, ordering, and tracking." },
  { icon: <LayoutGrid className="size-5" />, title: "Program management", body: "Launch and run weight, hormone, recovery, and longevity programs with approved products and protocols." },
  { icon: <GraduationCap className="size-5" />, title: "Clinic & staff education", body: "A versioned, reviewed library with role-based assignment and certification tracking." },
  { icon: <Stethoscope className="size-5" />, title: "Patient education", body: "Consistent, approved patient communication that keeps programs adherent and safe." },
  { icon: <Boxes className="size-5" />, title: "Formulary intelligence", body: "A normalized catalog across pharmacies with per-jurisdiction availability, never assumed." },
  { icon: <BarChart3 className="size-5" />, title: "Analytics", body: "Executive dashboards for revenue, retention, fulfillment, and product utilization." },
  { icon: <MapPin className="size-5" />, title: "Multi-location", body: "Corporate roll-ups and location-scoped controls for groups and DSOs." },
  { icon: <LifeBuoy className="size-5" />, title: "Operational support", body: "Integrated support with a dedicated representative and full audit history." },
];

export default function MarketingHome() {
  return (
    <>
      {/* Hero */}
      <div className="relative overflow-hidden border-b border-border">
        <div className="grain absolute inset-0 opacity-60" />
        <Section className="relative py-20 sm:py-28">
          <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.05fr]">
            <div>
              <Badge variant="outline" className="gap-1.5"><span className="size-1.5 rounded-full bg-accent-strong" /> For modern specialty practices</Badge>
              <h1 className="mt-5 text-4xl font-semibold leading-[1.05] tracking-tight text-primary sm:text-[3.5rem] sm:leading-[1.03]">
                The operating system<br className="hidden sm:block" /> for modern specialty care.
              </h1>
              <p className="mt-5 font-serif text-xl text-foreground/80">Independent practices. A stronger tomorrow.</p>
              <p className="mt-4 max-w-xl text-[17px] leading-relaxed text-muted-foreground">
                Connect your pharmacy workflows, equip your team, and manage specialty programs with greater clarity.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/book-demo"><Button size="lg">Book a Demo <ArrowRight className="size-4" /></Button></Link>
                <Link href="/app"><Button size="lg" variant="outline">Explore the demo</Button></Link>
              </div>
            </div>

            {/* Real product screenshot from the app (demo data) */}
            <div className="relative">
              <div className="overflow-hidden rounded-xl border border-border bg-card shadow-lift">
                <div className="flex items-center gap-1.5 border-b border-border bg-muted/50 px-3.5 py-2.5">
                  <span className="size-2.5 rounded-full bg-border" />
                  <span className="size-2.5 rounded-full bg-border" />
                  <span className="size-2.5 rounded-full bg-border" />
                  <span className="ml-2 truncate text-xs text-muted-foreground">Project Peptides · Clinic dashboard</span>
                  <Badge variant="warning" className="ml-auto shrink-0">Demo data</Badge>
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/hero/dashboard.png"
                  alt="Project Peptides clinic dashboard: program KPIs, an orders-and-fulfillment trend, and the operational task feed. Demo data."
                  width={1440}
                  height={980}
                  className="block w-full"
                />
              </div>
            </div>
          </div>
        </Section>
      </div>

      {/* Positioning: fragmented vs one platform */}
      <Section className="py-20">
        <SectionHeading eyebrow="The problem" title="Clinics run programs across a dozen disconnected tools." subtitle="Separate pharmacy accounts, price sheets, portals, invoices, and tracking. Project Peptides consolidates the fragmented workflow into one premium interface — then goes further." />
        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-8">
            <p className="text-sm font-semibold text-muted-foreground">Today</p>
            <ul className="mt-4 space-y-3">
              {["Separate logins for each pharmacy","Price sheets in PDFs and spreadsheets","Manual ordering by fax and portal","No unified fulfillment tracking","Education scattered or missing","No program-level analytics"].map((t) => (
                <li key={t} className="flex items-start gap-2 text-sm text-muted-foreground"><span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-destructive/60" /> {t}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border-2 border-primary/20 bg-accent/30 p-8">
            <p className="text-sm font-semibold text-primary">With Project Peptides</p>
            <ul className="mt-4 space-y-3">
              {["One interface across every pharmacy relationship","A normalized formulary with live availability","Guided, jurisdiction-aware ordering workflows","Amazon-quality fulfillment tracking","A versioned education & training library","Program KPIs and executive analytics"].map((t) => (
                <li key={t} className="flex items-start gap-2 text-sm text-foreground"><span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" /> {t}</li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      {/* Layer diagram */}
      <div className="border-y border-border bg-card">
        <Section className="py-20">
          <SectionHeading center eyebrow="Where we sit" title="The connective layer between clinics and the pharmacy ecosystem." />
          <div className="mx-auto mt-12 flex max-w-3xl flex-col items-center gap-3">
            {[
              { label: "Clinic / Prescriber", tone: "bg-card border-border" },
              { label: "Project Peptides — technology, education, workflow, connectivity", tone: "bg-primary text-primary-foreground border-primary" },
              { label: "Pharmacy network / integrations", tone: "bg-card border-border" },
              { label: "503A / 503B pharmacies", tone: "bg-card border-border" },
              { label: "Patient / Clinic", tone: "bg-card border-border" },
            ].map((row, i, arr) => (
              <div key={row.label} className="flex w-full flex-col items-center">
                <div className={`w-full rounded-xl border px-6 py-4 text-center text-sm font-medium ${row.tone}`}>{row.label}</div>
                {i < arr.length - 1 && <div className="h-5 w-px bg-border" />}
              </div>
            ))}
          </div>
          <p className="mx-auto mt-8 max-w-2xl text-center text-sm text-muted-foreground">
            Project Peptides is <strong>not</strong> a pharmacy. Licensed clinicians remain responsible for prescribing; licensed pharmacies remain responsible for compounding, dispensing, and shipping.
          </p>
        </Section>
      </div>

      {/* Capabilities — lighter feature grid (not boxed cards) */}
      <Section className="py-20">
        <SectionHeading eyebrow="One platform, eight capabilities" title="The pharmacy marketplace is one module inside a larger clinic operating system." />
        <div className="mt-12 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {MODULES.map((m, i) => (
            <Reveal key={m.title} delay={(i % 4) * 0.05}>
              <div className="flex flex-col">
                <div className="flex size-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">{m.icon}</div>
                <h3 className="mt-4 text-[15px] font-semibold text-foreground">{m.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{m.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* Positioning distinction */}
      <div className="border-y border-border bg-card">
        <Section className="py-20">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <Eyebrow>Our differentiation</Eyebrow>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl text-balance">Most tools answer “how do I order across pharmacies?”</h2>
              <p className="mt-5 text-lg text-muted-foreground">Project Peptides answers a bigger question:</p>
              <p className="mt-2 text-2xl font-semibold text-primary">“How do I run this entire clinical program?”</p>
            </div>
            <StatStrip items={[
              { value: "5", label: "Connected pharmacies" },
              { value: "40+", label: "Normalized products" },
              { value: "12", label: "Locations managed" },
              { value: "100+", label: "Orders tracked" },
            ]} />
          </div>
        </Section>
      </div>

      <CTASection />
    </>
  );
}
