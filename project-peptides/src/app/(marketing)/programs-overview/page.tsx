import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageHero, Section, SectionHeading, CTASection } from "@/components/marketing/sections";

export const metadata = { title: "Programs" };

const PROGRAMS = [
  { name: "Weight Management", color: "#0E7C86", body: "Structured metabolic programs with approved products, required labs, and a defined follow-up cadence." },
  { name: "Hormone Optimization", color: "#5B6ABF", body: "Provider-supervised hormone programs with eligibility-aware ordering and licensure enforcement." },
  { name: "Recovery & Regenerative", color: "#C2683A", body: "Peptide and recovery protocols organized into repeatable, trackable programs." },
  { name: "Longevity", color: "#2E7D5B", body: "Longitudinal longevity programs with education, KPIs, and retention analytics." },
  { name: "Sexual Wellness", color: "#8E4585", body: "Discreet, compliant programs with patient education and consistent fulfillment." },
  { name: "Custom", color: "#3F7CAC", body: "Build your own program with the products, providers, labs, and forms you choose." },
];

export default function ProgramsOverviewPage() {
  return (
    <>
      <PageHero
        eyebrow="Programs"
        title="Turn services into repeatable, measurable programs."
        subtitle="A major Project Peptides differentiator: package approved products, providers, education, labs, follow-up, and pricing into programs your whole team can run consistently."
        cta={<Link href="/book-demo"><Button size="lg">Book a Demo</Button></Link>}
      />
      <Section className="py-20">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {PROGRAMS.map((p) => (
            <div key={p.name} className="overflow-hidden rounded-2xl border border-border bg-card shadow-subtle">
              <div className="h-1.5" style={{ background: p.color }} />
              <div className="p-6">
                <h3 className="text-lg font-semibold">{p.name}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{p.body}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-8 max-w-2xl text-sm text-muted-foreground">
          Project Peptides does not create medical protocols or dosing recommendations. Clinical content within a program requires medical review and approval before publication.
        </p>
      </Section>
      <CTASection />
    </>
  );
}
