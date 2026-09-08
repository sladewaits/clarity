import { PageHeader } from "@/components/app/page-header";
import { SupportCenter } from "@/components/app/support-center";
import { getSupportTickets } from "@/data/service";

export const metadata = { title: "Support" };

export default function SupportPage() {
  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader
        title="Support"
        description="Integrated support for order issues, pharmacy issues, fulfillment, billing, program questions, and platform help — with a dedicated Project Peptides representative."
      />
      <SupportCenter tickets={getSupportTickets()} />
    </div>
  );
}
