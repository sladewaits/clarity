import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Truck, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { OrderStatusBadge, PharmacyTypeBadge } from "@/components/domain/badges";
import { OrderTimeline } from "@/components/domain/order-timeline";
import {
  getOrder, getPatient, getUser, getPharmacy, getCanonicalProduct, getLocation,
} from "@/data/service";
import { formatCurrency, formatDate } from "@/lib/utils";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-medium">{value}</span>
    </div>
  );
}

export default function OrderDetail({ params }: { params: { id: string } }) {
  const order = getOrder(params.id);
  if (!order) notFound();
  const patient = getPatient(order.patientId);
  const provider = getUser(order.providerId);
  const pharmacy = getPharmacy(order.pharmacyId)!;
  const product = getCanonicalProduct(order.canonicalProductId);
  const location = getLocation(order.locationId);

  return (
    <div className="mx-auto max-w-[1100px]">
      <Link href="/app/orders" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> All orders
      </Link>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-mono text-2xl font-semibold tracking-tight">{order.ref}</h1>
            <OrderStatusBadge status={order.status} />
            {order.isDemo && <Badge variant="warning">Simulated Demo Order</Badge>}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {product?.name} · {order.strength} · Created {formatDate(order.createdAt)}
          </p>
        </div>
        {order.trackingNumber && (
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm">
            <Truck className="size-4 text-primary" />
            <span className="text-muted-foreground">{order.trackingCarrier}</span>
            <span className="font-mono font-medium">{order.trackingNumber}</span>
            <ExternalLink className="size-3.5 text-muted-foreground" />
          </div>
        )}
      </div>

      {order.isDemo && (
        <div className="mb-6 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-foreground">
          This is a <strong>simulated demo order</strong>. No prescription was transmitted to any pharmacy and no legal signature was captured. Tracking data is illustrative.
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Fulfillment timeline</CardTitle></CardHeader>
          <CardContent><OrderTimeline order={order} /></CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader><CardTitle>Order summary</CardTitle></CardHeader>
            <CardContent className="divide-y divide-border pt-0">
              <Row label="Patient" value={patient ? <Link className="text-primary hover:underline" href={`/app/patients/${patient.id}`}>{patient.firstName} {patient.lastName}</Link> : "—"} />
              <Row label="Provider" value={provider?.name ?? "—"} />
              <Row label="Location" value={location?.city ?? "—"} />
              <Row label="Medication" value={`${product?.name} ${order.strength}`} />
              <Row label="Form / Route" value={`${order.form} · ${order.route}`} />
              <Row label="Directions" value={<span className="max-w-[180px] text-xs">{order.directions}</span>} />
              <Row label="Quantity / Refills" value={`${order.quantity} · ${order.refills} refills`} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Pharmacy & cost</CardTitle></CardHeader>
            <CardContent className="divide-y divide-border pt-0">
              <Row label="Pharmacy" value={<Link className="text-primary hover:underline" href={`/app/pharmacies/${pharmacy.id}`}>{pharmacy.name}</Link>} />
              <Row label="Pathway" value={<PharmacyTypeBadge type={order.type} pathway={order.pathway} />} />
              <Row label="Medication" value={formatCurrency(order.priceCents)} />
              <Row label="Shipping" value={order.shippingCents ? formatCurrency(order.shippingCents) : "Included"} />
              <div className="flex items-center justify-between py-3">
                <span className="text-sm font-semibold">Estimated patient cost</span>
                <span className="text-base font-semibold tabular-nums">{formatCurrency(order.priceCents + order.shippingCents)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
