import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageHero, Section, FeatureCard, CTASection } from "@/components/marketing/sections";
import { GraduationCap, Users, Stethoscope, ShieldCheck, BookOpen, Award } from "lucide-react";

export const metadata = { title: "Education" };

export default function EducationOverviewPage() {
  return (
    <>
      <PageHero
        eyebrow="Education"
        title="A premium, reviewed education library."
        subtitle="Clinical education, staff training, patient communication, operations, and compliance — versioned, reviewed, assignable, and certification-tracked."
        cta={<Link href="/book-demo"><Button size="lg">Book a Demo</Button></Link>}
      />
      <Section className="py-20">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <FeatureCard icon={<Stethoscope className="size-5" />} title="Clinical education">Foundational and program-specific clinical modules, reviewed and versioned before publication.</FeatureCard>
          <FeatureCard icon={<Users className="size-5" />} title="Staff training">Onboarding, ordering, and communication training with role-based assignment.</FeatureCard>
          <FeatureCard icon={<BookOpen className="size-5" />} title="Patient education">Consistent, approved patient-facing content that supports adherence and safety.</FeatureCard>
          <FeatureCard icon={<ShieldCheck className="size-5" />} title="Compliance">HIPAA, 503A/503B, and adverse-event workflows that keep the whole team aligned.</FeatureCard>
          <FeatureCard icon={<Award className="size-5" />} title="Certification tracking">Track completion and expirations so certifications never lapse unnoticed.</FeatureCard>
          <FeatureCard icon={<GraduationCap className="size-5" />} title="Program launch">Playbooks and checklists that get new programs live quickly and correctly.</FeatureCard>
        </div>
      </Section>
      <CTASection />
    </>
  );
}
