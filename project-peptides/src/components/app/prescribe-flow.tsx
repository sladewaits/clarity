"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, ChevronRight, ChevronLeft, Pill, Search, ShieldAlert, Ban, PartyPopper, Truck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea, Label } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { PharmacyTypeBadge, RegulatoryBadge } from "@/components/domain/badges";
import { evaluateAvailability } from "@/lib/availability";
import type { CanonicalProduct, Pharmacy, PharmacyProduct } from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";

export interface PatientDTO {
  id: string; name: string; state: string; programName: string;
  providerId: string; providerName: string; providerLicenseStates: string[];
}

interface Props {
  patients: PatientDTO[];
  products: CanonicalProduct[];
  offers: PharmacyProduct[];
  pharmacies: Pharmacy[];
  preselectPatientId?: string;
  preselectSkuId?: string;
}

const STEPS = ["Patient", "Product", "Details", "Pharmacy", "Review"];

export function PrescribeFlow({ patients, products, offers, pharmacies, preselectPatientId, preselectSkuId }: Props) {
  const preSku = preselectSkuId ? offers.find((o) => o.id === preselectSkuId) : undefined;
  const [step, setStep] = useState(preSku ? 2 : 0);
  const [patientId, setPatientId] = useState(preselectPatientId ?? "");
  const [productId, setProductId] = useState(preSku?.canonicalProductId ?? "");
  const [productQuery, setProductQuery] = useState("");
  const [strength, setStrength] = useState(preSku?.strength ?? "");
  const [directions, setDirections] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [refills, setRefills] = useState(0);
  const [skuId, setSkuId] = useState(preselectSkuId ?? "");
  const [submitted, setSubmitted] = useState(false);

  const patient = patients.find((p) => p.id === patientId);
  const product = products.find((p) => p.id === productId);
  const pharmMap = useMemo(() => new Map(pharmacies.map((p) => [p.id, p])), [pharmacies]);

  const productOffers = useMemo(
    () => offers.filter((o) => o.canonicalProductId === productId),
    [offers, productId],
  );

  // availability per offer given the selected patient
  const offerRows = useMemo(() => {
    if (!product || !patient) return [];
    return productOffers
      .map((offer) => {
        const pharmacy = pharmMap.get(offer.pharmacyId)!;
        const availability = evaluateAvailability({
          product, pharmacy, sku: offer,
          ctx: {
            canonicalProductId: product.id, pharmacyId: pharmacy.id, pathway: pharmacy.pathway,
            patientState: patient.state, providerLicenseStates: patient.providerLicenseStates,
          },
        });
        return { offer, pharmacy, availability };
      })
      .sort((a, b) => (a.availability.eligible === b.availability.eligible ? (a.offer.priceCents - b.offer.priceCents) : a.availability.eligible ? -1 : 1));
  }, [product, patient, productOffers, pharmMap]);

  const selectedSku = offers.find((o) => o.id === skuId);
  const selectedPharmacy = selectedSku ? pharmMap.get(selectedSku.pharmacyId) : undefined;
  const total = selectedSku ? selectedSku.priceCents + selectedSku.shippingCents : 0;

  const filteredProducts = productQuery
    ? products.filter((p) => p.name.toLowerCase().includes(productQuery.toLowerCase()) || p.category.toLowerCase().includes(productQuery.toLowerCase()))
    : products;

  const canNext = [
    !!patientId,
    !!productId && !!strength,
    directions.trim().length > 3 && quantity > 0,
    !!skuId,
    true,
  ][step];

  if (submitted && selectedSku && selectedPharmacy && patient && product) {
    const ref = `RX-${Math.floor(10500 + Math.random() * 400)}`;
    return (
      <Card className="mx-auto max-w-2xl">
        <CardContent className="pt-8 text-center">
          <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-success/12 text-success"><PartyPopper className="size-7" /></span>
          <h2 className="mt-4 text-xl font-semibold">Demo order submitted</h2>
          <Badge variant="warning" className="mt-2">Simulated — no prescription was transmitted</Badge>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
            The pharmacy adapter for <strong>{selectedPharmacy.name}</strong> returned a simulated acknowledgement for <span className="font-mono">{ref}</span>. No legal signature was captured and nothing was sent to a real pharmacy.
          </p>

          <div className="mt-6 rounded-xl border border-border bg-muted/30 p-4 text-left">
            <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Patient</span><span className="font-medium">{patient.name}</span></div>
            <div className="mt-1.5 flex items-center justify-between text-sm"><span className="text-muted-foreground">Medication</span><span className="font-medium">{product.name} · {strength}</span></div>
            <div className="mt-1.5 flex items-center justify-between text-sm"><span className="text-muted-foreground">Pharmacy</span><span className="font-medium">{selectedPharmacy.name}</span></div>
            <div className="mt-1.5 flex items-center justify-between text-sm"><span className="text-muted-foreground">Estimated patient cost</span><span className="font-semibold">{formatCurrency(total)}</span></div>
          </div>

          <div className="mt-6 flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
            <Truck className="size-4" /> Status: <span className="font-medium text-foreground">Accepted by pharmacy</span> (simulated)
          </div>

          <div className="mt-6 flex justify-center gap-2">
            <Link href="/app/orders"><Button variant="outline">View all orders</Button></Link>
            <Button onClick={() => { setSubmitted(false); setStep(0); setPatientId(""); setProductId(""); setStrength(""); setDirections(""); setSkuId(""); }}>New prescription</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      {/* stepper */}
      <div className="mb-6 flex items-center">
        {STEPS.map((s, i) => (
          <div key={s} className="flex flex-1 items-center last:flex-none">
            <div className="flex items-center gap-2">
              <span className={cn("flex size-7 items-center justify-center rounded-full text-xs font-semibold",
                i < step ? "bg-primary text-primary-foreground" : i === step ? "bg-primary/15 text-primary ring-2 ring-primary/30" : "bg-muted text-muted-foreground")}>
                {i < step ? <Check className="size-3.5" /> : i + 1}
              </span>
              <span className={cn("hidden text-sm font-medium sm:block", i === step ? "text-foreground" : "text-muted-foreground")}>{s}</span>
            </div>
            {i < STEPS.length - 1 && <span className={cn("mx-2 h-px flex-1", i < step ? "bg-primary/40" : "bg-border")} />}
          </div>
        ))}
      </div>

      <Card>
        <CardContent className="pt-6">
          {/* Step 0: patient */}
          {step === 0 && (
            <div>
              <h3 className="mb-1 font-semibold">Select a patient</h3>
              <p className="mb-4 text-sm text-muted-foreground">Patient-specific (503A) prescription workflow.</p>
              <Select value={patientId} onChange={(e) => setPatientId(e.target.value)}>
                <option value="">Choose a patient…</option>
                {patients.map((p) => <option key={p.id} value={p.id}>{p.name} — {p.state} · {p.programName}</option>)}
              </Select>
              {patient && (
                <div className="mt-4 rounded-lg border border-border bg-muted/30 p-4 text-sm">
                  <p><span className="text-muted-foreground">Provider:</span> {patient.providerName}</p>
                  <p className="mt-1"><span className="text-muted-foreground">Provider licensed in:</span> {patient.providerLicenseStates.join(", ")}</p>
                  <p className="mt-1"><span className="text-muted-foreground">Patient state:</span> {patient.state}</p>
                </div>
              )}
            </div>
          )}

          {/* Step 1: product */}
          {step === 1 && (
            <div>
              <h3 className="mb-1 font-semibold">Select a product</h3>
              <p className="mb-4 text-sm text-muted-foreground">Search the formulary and pick a strength.</p>
              <div className="relative mb-3">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={productQuery} onChange={(e) => setProductQuery(e.target.value)} placeholder="Search products…" className="pl-9" />
              </div>
              <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
                {filteredProducts.map((p) => {
                  const blocked = p.regulatoryStatus === "not_available_compounded";
                  return (
                    <button key={p.id} disabled={blocked}
                      onClick={() => { setProductId(p.id); setStrength(p.strengths[0]); }}
                      className={cn("flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left transition-colors",
                        productId === p.id ? "border-primary bg-accent" : "border-border hover:bg-muted", blocked && "cursor-not-allowed opacity-60")}>
                      <div>
                        <p className="text-sm font-medium">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.category} · {p.defaultForm} · {p.defaultRoute}</p>
                      </div>
                      {blocked ? <RegulatoryBadge status={p.regulatoryStatus} /> : productId === p.id ? <Check className="size-4 text-primary" /> : null}
                    </button>
                  );
                })}
              </div>
              {product && (
                <div className="mt-4">
                  <Label>Strength</Label>
                  <Select value={strength} onChange={(e) => setStrength(e.target.value)} className="mt-1">
                    {product.strengths.map((s) => <option key={s} value={s}>{s}</option>)}
                  </Select>
                </div>
              )}
            </div>
          )}

          {/* Step 2: details */}
          {step === 2 && product && (
            <div>
              <h3 className="mb-1 font-semibold">Prescription details</h3>
              <p className="mb-4 text-sm text-muted-foreground">{product.name} · {strength} · {product.defaultForm} · {product.defaultRoute}</p>
              <div className="space-y-4">
                <div>
                  <Label>Directions (Sig)</Label>
                  <Textarea className="mt-1" value={directions} onChange={(e) => setDirections(e.target.value)} placeholder="e.g. Inject 0.25 mL subcutaneously once daily in the morning." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Quantity</Label>
                    <Input className="mt-1" type="number" min={1} value={quantity} onChange={(e) => setQuantity(Math.max(1, +e.target.value))} />
                  </div>
                  <div>
                    <Label>Refills</Label>
                    <Input className="mt-1" type="number" min={0} value={refills} onChange={(e) => setRefills(Math.max(0, +e.target.value))} />
                  </div>
                </div>
                <p className="rounded-lg border border-dashed border-border bg-muted/40 p-3 text-xs text-muted-foreground">
                  Project Peptides does not provide dosing recommendations. Directions are entered by the prescribing provider.
                </p>
              </div>
            </div>
          )}

          {/* Step 3: pharmacy */}
          {step === 3 && (
            <div>
              <h3 className="mb-1 font-semibold">Select a pharmacy</h3>
              <p className="mb-4 text-sm text-muted-foreground">Availability is evaluated for {patient?.name} ({patient?.state}) by the regulatory engine.</p>
              <div className="space-y-2.5">
                {offerRows.map(({ offer, pharmacy, availability }) => {
                  const ok = availability.eligible;
                  return (
                    <button key={offer.id} disabled={!ok} onClick={() => setSkuId(offer.id)}
                      className={cn("flex w-full items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left transition-colors",
                        skuId === offer.id ? "border-primary bg-accent" : "border-border hover:bg-muted", !ok && "cursor-not-allowed opacity-70")}>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{pharmacy.name}</span>
                          <PharmacyTypeBadge type={offer.type} />
                        </div>
                        {ok ? (
                          <p className="text-xs text-muted-foreground">{offer.fulfillmentDays[0]}–{offer.fulfillmentDays[1]} days · {offer.shippingCents ? formatCurrency(offer.shippingCents) + " shipping" : "shipping included"}</p>
                        ) : (
                          <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-warning"><ShieldAlert className="size-3" /> {availability.reasons[0]}</p>
                        )}
                      </div>
                      <div className="text-right">
                        {ok ? <span className="text-sm font-semibold tabular-nums">{formatCurrency(offer.priceCents)}</span> : <Ban className="size-4 text-muted-foreground" />}
                      </div>
                    </button>
                  );
                })}
                {offerRows.length === 0 && <p className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">No pharmacy lists this product.</p>}
              </div>
            </div>
          )}

          {/* Step 4: review */}
          {step === 4 && patient && product && selectedSku && selectedPharmacy && (
            <div>
              <h3 className="mb-4 font-semibold">Review prescription</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <ReviewBlock title="Patient information" rows={[["Name", patient.name], ["State", patient.state], ["Program", patient.programName]]} />
                <ReviewBlock title="Provider information" rows={[["Provider", patient.providerName], ["Licensed in", patient.providerLicenseStates.join(", ")]]} />
                <ReviewBlock title="Medication" rows={[["Product", product.name], ["Strength", strength], ["Form / Route", `${product.defaultForm} · ${product.defaultRoute}`], ["Directions", directions], ["Qty / Refills", `${quantity} · ${refills}`]]} />
                <ReviewBlock title="Selected pharmacy" rows={[["Pharmacy", selectedPharmacy.name], ["Pathway", `${selectedSku.type} · Patient-Specific`], ["Price", formatCurrency(selectedSku.priceCents)], ["Shipping", selectedSku.shippingCents ? formatCurrency(selectedSku.shippingCents) : "Included"]]} />
              </div>
              <div className="mt-4 flex items-center justify-between rounded-lg border border-border bg-accent/40 px-4 py-3">
                <span className="font-medium">Estimated patient cost</span>
                <span className="text-lg font-semibold tabular-nums">{formatCurrency(total)}</span>
              </div>
              <div className="mt-4 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm">
                <ShieldAlert className="mr-1.5 inline size-4 text-warning" />
                Development mode: submitting creates a <strong>simulated demo order</strong> via the pharmacy adapter. No prescription is transmitted and no legal signature is captured.
              </div>
            </div>
          )}

          {/* nav */}
          <div className="mt-6 flex items-center justify-between border-t border-border pt-5">
            <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
              <ChevronLeft className="size-4" /> Back
            </Button>
            {step < STEPS.length - 1 ? (
              <Button onClick={() => setStep((s) => s + 1)} disabled={!canNext}>Continue <ChevronRight className="size-4" /></Button>
            ) : (
              <Button onClick={() => setSubmitted(true)}><Pill className="size-4" /> Submit Demo Order</Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ReviewBlock({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <div className="rounded-lg border border-border p-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <dl className="space-y-1.5">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3 text-sm">
            <dt className="shrink-0 text-muted-foreground">{k}</dt>
            <dd className="text-right font-medium">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
