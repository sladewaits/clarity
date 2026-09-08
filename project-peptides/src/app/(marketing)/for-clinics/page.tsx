import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHero, Section, SectionHeading, CTASection } from "@/components/marketing/sections";

export const metadata = { title: "For Clinics" };

const PLANS = [
  { name: "Founding Clinic", price: "$1,000", cadence: "/month", tagline: "A single location launching its first specialty program.", features: ["1 location", "Up to 8 seats", "Pharmacy network access", "Program & education library", "Standard support"], featured: false },
  { name: "Growth", price: "$1,500", cadence: "/month", tagline: "Multi-provider clinics scaling programs across locations.", features: ["Up to 4 locations", "Up to 25 seats", "Advanced analytics", "Multi-location controls", "Priority support", "Program KPIs"], featured: true },
  { name: "Enterprise", price: "Custom", cadence: "", tagline: "Groups and DSOs standardizing across a portfolio.", features: ["Unlimited locations", "Unlimited seats", "Corporate roll-up analytics", "SSO & audit exports", "Dedicated success manager", "Custom integrations"], featured: false },
];

export default function ForClinicsPage() {
  return (
    <>
      <PageHero
        eyebrow="For Clinics"
        title="Launch, manage, and scale specialty programs."
        subtitle="Whether you're a single med spa or a multi-location group, Project Peptides gives your team one place to run the entire program."
        cta={<Link href="/book-demo"><Button size="lg">Book a Demo</Button></Link>}
      />
      <Section className="py-20">
        <SectionHeading center eyebrow="Pricing" title="Simple plans that grow with you." />
        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {PLANS.map((p) => (
            <div key={p.name} className={`flex flex-col rounded-2xl border bg-card p-8 shadow-subtle ${p.featured ? "border-primary ring-2 ring-primary/20" : "border-border"}`}>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">{p.name}</h3>
                {p.featured && <Badge>Most popular</Badge>}
              </div>
              <p className="mt-4 text-3xl font-semibold tracking-tight">{p.price}<span className="text-base font-normal text-muted-foreground">{p.cadence}</span></p>
              <p className="mt-2 text-sm text-muted-foreground">{p.tagline}</p>
              <ul className="mt-6 flex-1 space-y-3">
                {p.features.map((f) => <li key={f} className="flex items-start gap-2 text-sm"><Check className="mt-0.5 size-4 shrink-0 text-primary" /> {f}</li>)}
              </ul>
              <Link href="/book-demo" className="mt-8"><Button variant={p.featured ? "default" : "outline"} className="w-full">{p.price === "Custom" ? "Contact sales" : "Book a Demo"}</Button></Link>
            </div>
          ))}
        </div>
        <p className="mt-8 text-center text-sm text-muted-foreground">Payments are not processed in this MVP. Billing is a Stripe-compatible abstraction.</p>
      </Section>
      <CTASection />
    </>
  );
}
