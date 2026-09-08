import Link from "next/link";
import { StatCard } from "@/components/app/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { IntegrationBadge, CredentialBadge, RegulatoryBadge } from "@/components/domain/badges";
import { platformMetrics } from "@/data/metrics";
import {
  getAllOrganizations, getAllLocations, getAllPatients, getPharmacies, getCanonicalProducts, getProviders,
} from "@/data/service";
import { db } from "@/data/mock";
import { formatCompactCurrency, formatDate } from "@/lib/utils";
import { ROLE_LABELS } from "@/lib/rbac";

export default function AdminPage() {
  const m = platformMetrics();
  const orgs = getAllOrganizations();
  const locations = getAllLocations();
  const patients = getAllPatients();
  const pharmacies = getPharmacies();
  const products = getCanonicalProducts();
  const tickets = db.supportTickets;

  const organizations = (
    <Card>
      <CardContent className="pt-6">
        <Table>
          <TableHeader><TableRow><TableHead>Organization</TableHead><TableHead>Plan</TableHead><TableHead>Locations</TableHead><TableHead>Providers</TableHead><TableHead>Patients</TableHead><TableHead>Since</TableHead></TableRow></TableHeader>
          <TableBody>
            {orgs.map((o) => (
              <TableRow key={o.id}>
                <TableCell className="font-medium">{o.name}</TableCell>
                <TableCell><Badge variant="secondary" className="capitalize">{o.plan}</Badge></TableCell>
                <TableCell>{o.locationIds.length}</TableCell>
                <TableCell>{getProviders(o.id).length}</TableCell>
                <TableCell>{patients.filter((p) => p.orgId === o.id).length}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatDate(o.createdAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  const pharmacyMgmt = (
    <Card>
      <CardContent className="pt-6">
        <Table>
          <TableHeader><TableRow><TableHead>Pharmacy</TableHead><TableHead>Type</TableHead><TableHead>Integration</TableHead><TableHead>Method</TableHead><TableHead>States</TableHead><TableHead>Credential</TableHead></TableRow></TableHeader>
          <TableBody>
            {pharmacies.map((ph) => (
              <TableRow key={ph.id}>
                <TableCell className="font-medium">{ph.name}</TableCell>
                <TableCell><Badge variant={ph.type === "503A" ? "default" : "secondary"} className="font-mono">{ph.type}</Badge></TableCell>
                <TableCell><IntegrationBadge status={ph.integrationStatus} /></TableCell>
                <TableCell><Badge variant="muted" className="font-mono">{ph.orderingMethod}</Badge></TableCell>
                <TableCell className="text-sm text-muted-foreground">{ph.statesServed.length}</TableCell>
                <TableCell><CredentialBadge status={ph.credentials[0]?.status ?? "pending"} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  const catalog = (
    <Card>
      <CardContent className="pt-6">
        <Table>
          <TableHeader><TableRow><TableHead>Canonical product</TableHead><TableHead>Category</TableHead><TableHead>Form</TableHead><TableHead>Pharmacy SKUs</TableHead><TableHead>Regulatory status</TableHead></TableRow></TableHeader>
          <TableBody>
            {products.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell className="text-sm">{p.category}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{p.defaultForm}</TableCell>
                <TableCell>{db.pharmacyProducts.filter((pp) => pp.canonicalProductId === p.id).length}</TableCell>
                <TableCell><RegulatoryBadge status={p.regulatoryStatus} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  const support = (
    <Card>
      <CardContent className="pt-6">
        <Table>
          <TableHeader><TableRow><TableHead>Ref</TableHead><TableHead>Subject</TableHead><TableHead>Category</TableHead><TableHead>Priority</TableHead><TableHead>Assignee</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
          <TableBody>
            {tickets.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-mono text-sm">{t.ref}</TableCell>
                <TableCell className="text-sm">{t.subject}</TableCell>
                <TableCell className="text-sm capitalize text-muted-foreground">{t.category}</TableCell>
                <TableCell><Badge variant={t.priority === "urgent" ? "destructive" : t.priority === "high" ? "warning" : "muted"} className="capitalize">{t.priority}</Badge></TableCell>
                <TableCell className="text-sm">{t.assignee}</TableCell>
                <TableCell><Badge variant={t.status === "resolved" ? "success" : "secondary"} className="capitalize">{t.status.replace("_", " ")}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  const flags = (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader><CardTitle className="text-base">Feature flags</CardTitle></CardHeader>
        <CardContent className="space-y-2 pt-0 text-sm">
          {[["503B clinic-supply ordering","on"],["Provider licensure enforcement","on"],["Live pricing feeds","off"],["eRx transmission","off"],["Stripe billing","off"],["Lab integration","off"]].map(([f, s]) => (
            <div key={f} className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
              <span>{f}</span>
              <Badge variant={s === "on" ? "success" : "muted"}>{s === "on" ? "Enabled" : "Disabled"}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Integrations & pricing feeds</CardTitle></CardHeader>
        <CardContent className="space-y-2 pt-0 text-sm text-muted-foreground">
          <p>Pharmacy pricing/availability feeds are ingested through the provider-neutral adapter layer. Concrete adapters (VITL, DocRx) are stubbed and marked pending.</p>
          <div className="space-y-2 pt-2">
            {Object.values(db.pharmacies).map((ph) => (
              <div key={ph.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                <span className="font-mono text-xs">{ph.adapterKey}</span>
                <IntegrationBadge status={ph.integrationStatus} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Platform overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">Operate clinics, pharmacies, catalog, pricing, education, and compliance across Project Peptides.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total clinics" value={String(m.clinics)} delta="+2" />
        <StatCard label="Active locations" value={String(m.locations)} />
        <StatCard label="Active providers" value={String(m.providers)} />
        <StatCard label="Patients" value={String(m.patients)} delta="+18" />
        <StatCard label="Monthly orders" value={String(m.monthlyOrders)} delta="+9%" />
        <StatCard label="Platform revenue" value={formatCompactCurrency(m.platformRevenueCents)} delta="+12%" />
        <StatCard label="Pharmacy volume" value={String(m.pharmacyVolume)} />
        <StatCard label="Support tickets" value={String(tickets.filter((t) => t.status !== "resolved").length)} delta="Open" deltaTone="neutral" />
      </div>

      <div className="mt-8">
        <Tabs
          tabs={[
            { value: "orgs", label: "Organizations", content: organizations },
            { value: "pharmacies", label: "Pharmacies", content: pharmacyMgmt },
            { value: "catalog", label: "Products & Formulary", content: catalog },
            { value: "support", label: "Support", content: support },
            { value: "flags", label: "Feature Flags & Integrations", content: flags },
          ]}
        />
      </div>
    </div>
  );
}
