import Link from "next/link";
import { ShieldCheck, Lock, KeyRound, ScrollText, EyeOff, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHero, Section, FeatureCard, CTASection } from "@/components/marketing/sections";

export const metadata = { title: "Security" };

export default function SecurityPage() {
  return (
    <>
      <PageHero
        eyebrow="Security & Compliance"
        title="Built like healthcare infrastructure."
        subtitle="Role-based access, minimum-necessary permissions, audit logging, and PHI-safe design are foundational — not afterthoughts."
        cta={<Link href="/book-demo"><Button size="lg">Talk to us</Button></Link>}
      />
      <Section className="py-20">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <FeatureCard icon={<KeyRound className="size-5" />} title="Role-based access control">Owner, Provider, Staff, and Admin roles with enforced, minimum-necessary permissions.</FeatureCard>
          <FeatureCard icon={<Lock className="size-5" />} title="Encryption">Encryption in transit and at rest are architectural targets for production deployment.</FeatureCard>
          <FeatureCard icon={<ScrollText className="size-5" />} title="Audit logging">An audit-log architecture captures access and changes to sensitive records.</FeatureCard>
          <FeatureCard icon={<EyeOff className="size-5" />} title="PHI-safe logging">Logging is designed to exclude protected health information by default.</FeatureCard>
          <FeatureCard icon={<History className="size-5" />} title="Access history">User access history and credential status are first-class concepts.</FeatureCard>
          <FeatureCard icon={<ShieldCheck className="size-5" />} title="Jurisdiction controls">State and pathway restrictions are enforced by the availability engine.</FeatureCard>
        </div>
        <div className="mt-12 rounded-2xl border border-warning/30 bg-warning/10 p-8">
          <Badge variant="warning">Honest disclosure</Badge>
          <p className="mt-4 max-w-3xl text-lg text-foreground">
            This MVP is <strong>not</strong> HIPAA compliant simply because these features exist. The repository includes <span className="font-mono text-base">docs/SECURITY.md</span> and <span className="font-mono text-base">docs/COMPLIANCE-READINESS.md</span> explaining exactly what remains before production use.
          </p>
        </div>
      </Section>
      <CTASection />
    </>
  );
}
