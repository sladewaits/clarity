import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Ban, Truck, Clock, ShieldAlert, GraduationCap, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PharmacyTypeBadge, RegulatoryBadge } from "@/components/domain/badges";
import { getProductComparison, getLocations } from "@/data/service";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

export default function ProductDetail({ params }: { params: { id: string } }) {
  const clinicState = getLocations()[0]?.state;
  const data = getProductComparison(params.id, { clinicState });
  if (!data) notFound();
  const { product, rows } = data;
  const blocked = product.regulatoryStatus === "not_available_compounded";
  const eligibleRows = rows.filter((r) => r.availability.eligible);

  return (
    <div className="mx-auto max-w-[1200px]">
      <Link href="/app/catalog" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Catalog
      </Link>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{product.category}</p>
          <h1 className="text-3xl font-semibold tracking-tight">{product.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{product.defaultForm}</Badge>
            <Badge variant="secondary">{product.defaultRoute}</Badge>
            {product.strengths.map((s) => <Badge key={s} variant="outline">{s}</Badge>)}
            <RegulatoryBadge status={product.regulatoryStatus} />
          </div>
        </div>
      </div>

      <p className="mb-6 max-w-3xl text-sm text-muted-foreground">{product.summary}</p>

      {/* Regulatory block (e.g. retatrutide) */}
      {blocked && (
        <Card className="mb-6 border-destructive/30 bg-destructive/5">
          <CardContent className="flex items-start gap-4 pt-6">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-destructive/12 text-destructive"><Ban className="size-5" /></span>
            <div>
              <h3 className="font-semibold text-foreground">Unavailable for Compounded Clinical Ordering</h3>
              <p className="mt-1 text-sm text-muted-foreground">{product.regulatoryNote}</p>
              <p className="mt-2 text-sm text-muted-foreground">This item is shown for educational reference only. Ordering is blocked by the regulatory availability engine and cannot be initiated.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Restricted / verification notice */}
      {(product.regulatoryStatus === "restricted" || product.regulatoryStatus === "verification_required") && (
        <Card className="mb-6 border-warning/30 bg-warning/5">
          <CardContent className="flex items-start gap-4 pt-6">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-warning/15 text-warning"><ShieldAlert className="size-5" /></span>
            <div>
              <h3 className="font-semibold text-foreground">Availability requires verification</h3>
              <p className="mt-1 text-sm text-muted-foreground">{product.regulatoryNote}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pharmacy comparison */}
      {!blocked && (
        <>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Compare pharmacies</h2>
            <span className="text-sm text-muted-foreground">{eligibleRows.length} of {rows.length} eligible for {clinicState}</span>
          </div>

          {rows.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">No connected pharmacy currently lists this product.</CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {rows.map(({ offer, pharmacy, availability }) => {
                const ok = availability.eligible;
                return (
                  <Card key={offer.id} className={cn("flex flex-col", !ok && "opacity-90")}>
                    <CardContent className="flex flex-1 flex-col pt-5">
                      <div className="flex items-start justify-between">
                        <div>
                          <Link href={`/app/pharmacies/${pharmacy.id}`} className="font-semibold hover:text-primary">{pharmacy.name}</Link>
                          <div className="mt-1"><PharmacyTypeBadge type={offer.type} pathway={offer.pathway} /></div>
                        </div>
                      </div>
                      <p className="mt-3 text-xs text-muted-foreground">{offer.pharmacyName}</p>

                      <div className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
                        <div className="flex items-center justify-between"><span className="text-muted-foreground">Strength</span><span className="font-medium">{offer.strength}</span></div>
                        <div className="flex items-center justify-between"><span className="text-muted-foreground">Price</span><span className="font-semibold tabular-nums">{formatCurrency(offer.priceCents)}</span></div>
                        <div className="flex items-center justify-between"><span className="text-muted-foreground">Shipping</span><span className="font-medium">{offer.shippingCents ? formatCurrency(offer.shippingCents) : "Included"}</span></div>
                        <div className="flex items-center justify-between"><span className="text-muted-foreground">Est. arrival</span><span className="inline-flex items-center gap-1 font-medium"><Clock className="size-3.5" />{offer.fulfillmentDays[0]}–{offer.fulfillmentDays[1]} days</span></div>
                      </div>

                      <div className="mt-4 flex-1" />

                      {ok ? (
                        <div className="mt-4">
                          <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-success"><Check className="size-3.5" /> Eligible for {clinicState}</div>
                          <Link href={`/app/prescribe?sku=${offer.id}`}>
                            <Button className="w-full">Select pharmacy</Button>
                          </Link>
                        </div>
                      ) : (
                        <div className="mt-4">
                          <div className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-foreground">
                            <ShieldAlert className="mr-1 inline size-3.5 text-warning" />
                            {availability.status === "blocked" ? "Blocked: " : "Availability requires verification. "}
                            {availability.reasons[0]}
                          </div>
                          <Button className="mt-2 w-full" variant="outline" disabled>Unavailable</Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Education + notices */}
      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><GraduationCap className="size-4 text-primary" /> Educational information</CardTitle></CardHeader>
          <CardContent className="pt-0 text-sm text-muted-foreground">
            Educational content for {product.name} is provided through the Education Center. Clinical decision-making and dosing remain the responsibility of the prescribing provider. Placeholder pending medical review.
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><ShieldAlert className="size-4 text-warning" /> Important notice</CardTitle></CardHeader>
          <CardContent className="pt-0 text-sm text-muted-foreground">
            Availability is evaluated per transaction against product regulatory status, pharmacy state coverage, ordering pathway, and provider licensure. Project Peptides never infers legality from the fact that a pharmacy lists a product.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
