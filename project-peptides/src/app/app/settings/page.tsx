import Link from "next/link";
import { Check, ShieldCheck, FileText, CreditCard } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/misc";
import { Tabs } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCurrentOrg, getInvoices, getPlans, getLocations, getTeam } from "@/data/service";
import { formatCurrency, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

export const metadata = { title: "Settings" };

export default function SettingsPage() {
  const org = getCurrentOrg();
  const plans = getPlans();
  const invoices = getInvoices();
  const currentPlan = org.plan;

  const organization = (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle className="text-base">Organization profile</CardTitle></CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div><Label>Organization name</Label><Input className="mt-1" defaultValue={org.name} /></div>
          <div><Label>Slug</Label><Input className="mt-1" defaultValue={org.slug} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Locations</Label><Input className="mt-1" defaultValue={String(getLocations().length)} disabled /></div>
            <div><Label>Team members</Label><Input className="mt-1" defaultValue={String(getTeam().length)} disabled /></div>
          </div>
          <Button>Save changes</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Integrations</CardTitle></CardHeader>
        <CardContent className="space-y-3 pt-0 text-sm">
          {[
            ["Pharmacy adapters", "5 connected · provider-neutral", "success"],
            ["Authentication (Auth0 / Clerk)", "Adapter ready — not connected", "warning"],
            ["Stripe billing", "Abstraction ready — not connected", "warning"],
            ["Lab / EHR", "Planned", "muted"],
          ].map(([name, status, tone]) => (
            <div key={name} className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
              <span className="font-medium">{name}</span>
              <Badge variant={tone as any}>{status}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );

  const billing = (
    <div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {plans.map((plan) => {
          const isCurrent = plan.key === currentPlan;
          return (
            <Card key={plan.key} className={cn("flex flex-col", isCurrent && "ring-2 ring-primary")}>
              <CardContent className="flex flex-1 flex-col pt-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{plan.name}</h3>
                  {isCurrent && <Badge variant="default">Current</Badge>}
                </div>
                <p className="mt-2 text-2xl font-semibold">{plan.priceCents != null ? formatCurrency(plan.priceCents, { cents: false }) : "Custom"}<span className="text-sm font-normal text-muted-foreground">{plan.priceCents != null ? "/mo" : ""}</span></p>
                <p className="mt-1 text-sm text-muted-foreground">{plan.tagline}</p>
                <ul className="mt-4 flex-1 space-y-2">
                  {plan.features.map((f) => <li key={f} className="flex items-start gap-2 text-sm"><Check className="mt-0.5 size-4 shrink-0 text-primary" /> {f}</li>)}
                </ul>
                <Button variant={isCurrent ? "outline" : "default"} className="mt-4" disabled={isCurrent}>{isCurrent ? "Current plan" : plan.priceCents ? "Switch plan" : "Contact sales"}</Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <div className="mt-3 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm">
        <CreditCard className="mr-1.5 inline size-4 text-warning" /> Payments are not processed in this MVP. Billing is a Stripe-compatible abstraction — no card is charged.
      </div>

      <Card className="mt-6">
        <CardHeader><CardTitle className="text-base">Invoices</CardTitle></CardHeader>
        <CardContent className="pt-0">
          <Table>
            <TableHeader><TableRow><TableHead>Number</TableHead><TableHead>Period</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {invoices.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="font-mono text-sm">{inv.number}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(inv.periodStart)} – {formatDate(inv.periodEnd)}</TableCell>
                  <TableCell className="text-right text-sm tabular-nums">{formatCurrency(inv.amountCents)}</TableCell>
                  <TableCell><Badge variant={inv.status === "paid" ? "success" : inv.status === "open" ? "warning" : "muted"} className="capitalize">{inv.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  const security = (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="size-4 text-primary" /> Security posture</CardTitle></CardHeader>
        <CardContent className="space-y-2 pt-0 text-sm">
          {["Role-based access control (enforced)","Minimum-necessary access model","Audit logging architecture","PHI-safe logging","Session security","Encryption in transit / at rest (target)"].map((s) => (
            <div key={s} className="flex items-center gap-2"><Check className="size-4 text-success" /> {s}</div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><FileText className="size-4 text-primary" /> Compliance documentation</CardTitle></CardHeader>
        <CardContent className="space-y-2 pt-0 text-sm text-muted-foreground">
          <p>Detailed security and compliance-readiness documentation is maintained in the repository:</p>
          <ul className="space-y-1">
            <li className="font-mono text-xs">docs/SECURITY.md</li>
            <li className="font-mono text-xs">docs/COMPLIANCE-READINESS.md</li>
          </ul>
          <p className="rounded-lg border border-dashed border-border bg-muted/40 p-3 text-xs">This MVP is <strong>not</strong> HIPAA compliant simply because these features exist. See the readiness doc for what remains before production use.</p>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader title="Settings" description={`${org.name} · organization, billing, security, and integrations.`} />
      <Tabs
        tabs={[
          { value: "org", label: "Organization", content: organization },
          { value: "billing", label: "Billing", content: billing },
          { value: "security", label: "Security & Compliance", content: security },
        ]}
      />
    </div>
  );
}
