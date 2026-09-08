import { BookDemoForm } from "@/components/marketing/book-demo-form";
import { Section } from "@/components/marketing/sections";
import { Check } from "lucide-react";

export const metadata = { title: "Book a Demo" };

export default function BookDemoPage() {
  return (
    <Section className="py-20">
      <div className="grid gap-12 lg:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Book a Demo</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-balance">See Project Peptides run your program.</h1>
          <p className="mt-4 text-lg text-muted-foreground">A guided, 30-minute walkthrough tailored to your clinic — pharmacy connectivity, program operations, education, fulfillment, and analytics.</p>
          <ul className="mt-8 space-y-3">
            {["A tour of the clinic operating system","Your programs mapped to the platform","Pharmacy connectivity and formulary walkthrough","Analytics and multi-location roll-ups"].map((t) => (
              <li key={t} className="flex items-start gap-2 text-sm"><Check className="mt-0.5 size-4 shrink-0 text-primary" /> {t}</li>
            ))}
          </ul>
        </div>
        <BookDemoForm />
      </div>
    </Section>
  );
}
