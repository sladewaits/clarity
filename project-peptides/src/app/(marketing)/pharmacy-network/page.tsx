import Link from "next/link";
import { ShieldCheck, Globe2, Workflow, FileCheck2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHero, Section, SectionHeading, FeatureCard, CTASection } from "@/components/marketing/sections";

export const metadata = { title: "Pharmacy Network" };

export default function PharmacyNetworkPage() {
  return (
    <>
      <PageHero
        eyebrow="Pharmacy Network"
        title="Every pharmacy relationship, one interface."
        subtitle="Consolidate 503A patient-specific and 503B clinic-supply relationships into a single marketplace — with credentials, coverage, and integration status surfaced for transparency."
        cta={<Link href="/book-demo"><Button size="lg">Book a Demo</Button></Link>}
      />
      <Section className="py-20">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <FeatureCard icon={<Workflow className="size-5" />} title="503A & 503B">Patient-specific prescriptions and clinic-supply ordering, each with the right workflow and eligibility rules.</FeatureCard>
          <FeatureCard icon={<Globe2 className="size-5" />} title="State coverage">Availability is scoped to the states each pharmacy serves and the jurisdictions where a product is confirmed.</FeatureCard>
          <FeatureCard icon={<FileCheck2 className="size-5" />} title="Credentials surfaced">Licenses and accreditations are shown for transparency, with an architecture ready to ingest authoritative verification.</FeatureCard>
          <FeatureCard icon={<ShieldCheck className="size-5" />} title="No false certification">Project Peptides surfaces pharmacy-reported credentials — it does not itself certify any pharmacy as safe.</FeatureCard>
        </div>
      </Section>
      <div className="border-y border-border bg-card">
        <Section className="py-16">
          <div className="rounded-2xl border border-border bg-background p-8">
            <Badge variant="warning">Important</Badge>
            <p className="mt-4 max-w-3xl text-lg text-foreground">
              The platform never infers that a product is legal simply because a pharmacy lists it. Availability is determined per transaction — by product regulatory status, pharmacy state coverage, ordering pathway, and provider licensure.
            </p>
          </div>
        </Section>
      </div>
      <CTASection />
    </>
  );
}
