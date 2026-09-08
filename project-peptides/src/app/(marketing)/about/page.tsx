import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageHero, Section, SectionHeading, StatStrip, CTASection } from "@/components/marketing/sections";

export const metadata = { title: "About" };

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="About"
        title="We believe clinics should say: “Project Peptides runs our program.”"
        subtitle="We're building the technology, education, workflow, and connectivity layer between modern clinics and the fragmented pharmacy and program ecosystem."
        cta={<Link href="/book-demo"><Button size="lg">Book a Demo</Button></Link>}
      />
      <Section className="py-20">
        <div className="grid gap-12 lg:grid-cols-2">
          <div>
            <SectionHeading eyebrow="Our role" title="Infrastructure, not a pharmacy." />
            <div className="mt-6 space-y-4 text-muted-foreground">
              <p>Project Peptides is not a pharmacy and does not compound, dispense, or ship medications. Licensed clinicians remain responsible for clinical decision-making and prescribing. Licensed pharmacies remain responsible for compounding, dispensing, labeling, shipping, and pharmacy compliance.</p>
              <p>We are the connective layer: pharmacy connectivity, program operations, education, formulary intelligence, analytics, and operational support — unified in one premium interface.</p>
              <p>Our differentiation goes beyond connectivity. The pharmacy marketplace is one module inside a larger clinic operating system designed to help clinics launch, manage, and scale specialty cash-pay programs.</p>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-8">
            <StatStrip items={[
              { value: "1", label: "Platform" },
              { value: "10", label: "Capabilities" },
              { value: "503A/B", label: "Pathways" },
              { value: "∞", label: "Locations at Enterprise" },
            ]} />
            <p className="mt-8 border-t border-border pt-6 text-sm text-muted-foreground">This is a demonstration MVP with fictional data. It is designed to show the product vision to clinics, physicians, pharmacies, and investors.</p>
          </div>
        </div>
      </Section>
      <CTASection />
    </>
  );
}
