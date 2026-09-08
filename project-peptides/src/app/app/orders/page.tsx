import { Plus } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { OrdersTable } from "@/components/app/orders-table";
import { getOrders, getPatient, getCanonicalProduct, getPharmacy } from "@/data/service";

export const metadata = { title: "Prescriptions / Orders" };

export default function OrdersPage() {
  const rows = getOrders().map((o) => {
    const patient = getPatient(o.patientId);
    return {
      id: o.id, ref: o.ref,
      patientName: patient ? `${patient.firstName} ${patient.lastName}` : "—",
      productName: getCanonicalProduct(o.canonicalProductId)?.name ?? "—",
      strength: o.strength,
      pharmacyName: getPharmacy(o.pharmacyId)?.name.split(" ")[0] ?? "—",
      type: o.type, status: o.status, totalCents: o.priceCents + o.shippingCents,
      createdAt: o.createdAt, isDemo: o.isDemo,
    };
  });

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader
        title="Prescriptions & Orders"
        description="Every patient-specific prescription and clinic-supply order across the organization."
        actions={<Link href="/app/prescribe"><Button><Plus className="size-4" /> New prescription</Button></Link>}
      />
      <OrdersTable rows={rows} />
    </div>
  );
}
