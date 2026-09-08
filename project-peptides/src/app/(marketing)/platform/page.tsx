import Link from "next/link";
import { Building2, Search, Workflow, Truck, LayoutGrid, BarChart3, ShieldCheck, Boxes } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHero, Section, SectionHeading, FeatureCard, CTASection } from "@/components/marketing/sections";

export const metadata = { title: "Platform" };

const CAPABILITIES = [
  { icon: <Search className="size-5" />, title: "Universal product search", body: "Search one normalized formulary across every connected pharmacy, with per-jurisdiction availability." },
  { icon: <Building2 className="size-5" />, title: "Pharmacy network", body: "A marketplace of approved 503A and 503B relationships with credentials, coverage, and integration status." },
  { icon: <Workflow className="size-5" />, title: "Ordering workflows", body: "Guided, availability-aware prescription and clinic-supply workflows built on a provider-neutral adapter layer." },
  { icon: <Truck className="size-5" />, title: "Fulfillment tracking", body: "Amazon-quality order timelines from draft through delivery, with exception handling." },
  { icon: <LayoutGrid className="size-5" />, title: "Programs", body: "Approved products, providers, labs, education, follow-up cadence, and KPIs in one place." },
  { icon: <BarChart3 className="size-5" />, title: "Analytics", body: "Executive dashboards for revenue, retention, fulfillment, and utilization across locations." },
];

export default function PlatformPage() {
  return (
    <>
      <PageHero
        eyebrow="Platform"
        title="One premium interface for the entire program."
        subtitle="From product search to fulfillment to analytics — Project Peptides replaces a dozen disconnected tools with a single clinic operating system."
        cta={<><Link href="/app"><Button size="lg">Explore the demo</Button></Link><Link href="/book-demo"><Button size="lg" variant="outline">Book a Demo</Button></Link></>}
      />
      <Section className="py-20">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {CAPABILITIES.map((c) => <FeatureCard key={c.title} icon={c.icon} title={c.title}>{c.body}</FeatureCard>)}
        </div>
      </Section>

      <div className="border-y border-border bg-card">
        <Section className="py-20">
          <SectionHeading eyebrow="Architecture" title="Built like healthcare infrastructure." subtitle="A provider-neutral pharmacy adapter layer, a normalized product model, and a per-transaction availability engine mean the platform scales without rewriting application code." />
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            <FeatureCard icon={<Boxes className="size-5" />} title="Normalized product model">Canonical products unify pharmacy-specific SKUs so clinics search one formulary while pharmacy detail is preserved.</FeatureCard>
            <FeatureCard icon={<Workflow className="size-5" />} title="Pharmacy adapter layer">Every pharmacy — API, portal, EDI, or fax — is normalized behind one interface. New vendors are onboarded by implementing an adapter.</FeatureCard>
            <FeatureCard icon={<ShieldCheck className="size-5" />} title="Availability engine">Availability is evaluated per transaction against regulatory status, state coverage, pathway, and licensure. If eligibility can't be established, the transaction is blocked.</FeatureCard>
          </div>
        </Section>
      </div>
      <CTASection />
    </>
  );
}
