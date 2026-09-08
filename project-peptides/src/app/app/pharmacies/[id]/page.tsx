import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, Phone, Truck, Boxes, FileCheck2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CredentialBadge, IntegrationBadge, PharmacyTypeBadge } from "@/components/domain/badges";
import { getPharmacy, getPharmacies } from "@/data/service";
import { adapterRegistry } from "@/lib/pharmacy/mock-adapters";
import { formatDate } from "@/lib/utils";

export function generateStaticParams() {
  return getPharmacies().map((p) => ({ id: p.id }));
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-medium">{value}</span>
    </div>
  );
}

export default function PharmacyProfile({ params }: { params: { id: string } }) {
  const ph = getPharmacy(params.id);
  if (!ph) notFound();
  const adapter = adapterRegistry[ph.adapterKey];

  return (
    <div className="mx-auto max-w-[1100px]">
      <Link href="/app/pharmacies" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Pharmacy network
      </Link>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{ph.name}</h1>
          <div className="mt-2 flex items-center gap-2">
            <PharmacyTypeBadge type={ph.type} pathway={ph.pathway} />
            <IntegrationBadge status={ph.integrationStatus} />
          </div>
        </div>
        <Link href="/app/catalog"><Button variant="outline"><Boxes className="size-4" /> Browse this pharmacy&apos;s catalog</Button></Link>
      </div>

      <p className="mb-6 max-w-2xl text-sm text-muted-foreground">{ph.blurb}</p>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
          <CardContent className="grid gap-x-8 sm:grid-cols-2 pt-0 divide-y divide-border sm:divide-y-0">
            <div className="divide-y divide-border">
              <Row label="Designation" value={ph.type} />
              <Row label="Pathway" value={ph.pathway === "patient_specific" ? "Patient-Specific" : "Clinic Supply"} />
              <Row label="States served" value={ph.statesServed.join(", ")} />
              <Row label="Typical fulfillment" value={`${ph.typicalFulfillmentDays[0]}–${ph.typicalFulfillmentDays[1]} days`} />
            </div>
            <div className="divide-y divide-border">
              <Row label="Ordering method" value={<Badge variant="secondary" className="font-mono">{ph.orderingMethod}</Badge>} />
              <Row label="Integration" value={<IntegrationBadge status={ph.integrationStatus} />} />
              <Row label="Adapter" value={<span className="font-mono text-xs">{adapter?.key ?? "—"}</span>} />
              <Row label="Last credential check" value={formatDate(ph.lastCredentialCheck)} />
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader><CardTitle>Shipping</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-2 pt-0">
              {ph.shippingOptions.map((s) => (
                <div key={s} className="flex items-center gap-2 text-sm"><Truck className="size-4 text-muted-foreground" /> {s}</div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Support</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-2 pt-0 text-sm">
              <a href={`mailto:${ph.supportEmail}`} className="flex items-center gap-2 text-primary hover:underline"><Mail className="size-4" /> {ph.supportEmail}</a>
              <div className="flex items-center gap-2"><Phone className="size-4 text-muted-foreground" /> {ph.supportPhone}</div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="mt-6">
        <CardHeader><CardTitle>Product categories</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2 pt-0">
          {ph.productCategories.map((c) => <Badge key={c} variant="secondary">{c}</Badge>)}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Quality & credentials</CardTitle>
          <p className="text-sm text-muted-foreground">Self-reported by the pharmacy. Project Peptides surfaces these documents for transparency and does not certify the pharmacy.</p>
        </CardHeader>
        <CardContent className="divide-y divide-border pt-0">
          {ph.credentials.map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-3 py-3">
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground"><FileCheck2 className="size-4" /></span>
                <div>
                  <p className="text-sm font-medium">{c.label}</p>
                  <p className="text-xs text-muted-foreground">{c.authority} · verified {formatDate(c.lastVerifiedAt)}</p>
                </div>
              </div>
              <CredentialBadge status={c.status} />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
