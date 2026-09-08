import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { StatCard } from "@/components/app/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/app/icon";
import { TrendArea } from "@/components/app/charts";
import { IntegrationBadge, OrderStatusBadge } from "@/components/domain/badges";
import {
  getActivity, getAlerts, getCurrentOrg, getCurrentUser, getOrders, getPatient, getPharmacies,
} from "@/data/service";
import { homeMetrics, ordersByMonth } from "@/data/metrics";
import { formatCompactCurrency, formatCurrency, initials, relativeTime } from "@/lib/utils";

export default function HomePage() {
  const org = getCurrentOrg();
  const user = getCurrentUser();
  const m = homeMetrics();
  const trend = ordersByMonth(getOrders(), 12);
  const alerts = getAlerts();
  const activity = getActivity();
  const recentOrders = getOrders().slice(0, 6);
  const pharmacies = getPharmacies();

  const alertTone = { info: "default", warning: "warning", critical: "destructive" } as const;

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader
        title={`Good afternoon, ${user.name.split(" ")[0]}`}
        description={`${org.name} · Command center across ${org.locationIds.length} locations`}
        actions={
          <>
            <Link href="/app/catalog" className="hidden sm:inline-flex">
              <Button variant="outline">Search catalog</Button>
            </Link>
            <Link href="/app/prescribe">
              <Button><Plus className="size-4" /> New prescription</Button>
            </Link>
          </>
        }
      />

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Active Patients" value={String(m.activePatients)} delta="+6%" hint="vs last month" />
        <StatCard label="Orders This Month" value={String(m.ordersThisMonth)} delta="+12%" />
        <StatCard label="Pending Prescriptions" value={String(m.pendingPrescriptions)} delta="Needs review" deltaTone="neutral" />
        <StatCard label="In Fulfillment" value={String(m.inFulfillment)} delta="Live" deltaTone="neutral" />
        <StatCard label="Delivered Orders" value={String(m.delivered)} delta="+9%" />
        <StatCard label="Est. Monthly Program Revenue" value={formatCompactCurrency(m.monthlyRevenueCents)} delta="+14%" />
        <StatCard label="Avg. Fulfillment Time" value={`${m.avgFulfillDays} days`} delta="-0.3d" deltaTone="positive" />
        <StatCard label="Patient Retention" value={`${m.retentionPct}%`} delta="+2%" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Orders trend */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Orders & fulfillment</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">Trailing 12 months</p>
            </div>
            <Badge variant="muted">Mock data</Badge>
          </CardHeader>
          <CardContent>
            <TrendArea data={trend} dataKey="orders" />
          </CardContent>
        </Card>

        {/* Operational feed */}
        <Card>
          <CardHeader>
            <CardTitle>Operational feed</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {activity.map((a) => (
              <div key={a.id} className="flex items-start gap-3">
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <Icon name={a.icon} className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-snug">{a.title}</p>
                  <p className="text-xs text-muted-foreground">{a.detail} · {relativeTime(a.at)}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent orders */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Recent orders</CardTitle>
            <Link href="/app/orders" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
              View all <ArrowRight className="size-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="flex flex-col divide-y divide-border">
            {recentOrders.map((o) => {
              const patient = getPatient(o.patientId);
              return (
                <Link key={o.id} href={`/app/orders/${o.id}`} className="flex items-center justify-between gap-3 py-3 -mx-2 px-2 rounded-lg hover:bg-muted/60">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex size-9 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
                      {patient ? initials(`${patient.firstName} ${patient.lastName}`) : "—"}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{patient ? `${patient.firstName} ${patient.lastName}` : "Unknown"}</p>
                      <p className="truncate text-xs text-muted-foreground font-mono">{o.ref} · {o.strength}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="hidden text-sm tabular-nums text-muted-foreground sm:block">{formatCurrency(o.priceCents + o.shippingCents)}</span>
                    <OrderStatusBadge status={o.status} />
                  </div>
                </Link>
              );
            })}
          </CardContent>
        </Card>

        {/* Alerts + pharmacy status */}
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader><CardTitle>Alerts</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-3">
              {alerts.map((a) => (
                <div key={a.id} className="flex items-start gap-3">
                  <Badge variant={alertTone[a.severity]} className="mt-0.5 shrink-0 capitalize">{a.severity}</Badge>
                  <div>
                    <p className="text-sm font-medium leading-snug">{a.title}</p>
                    <p className="text-xs text-muted-foreground">{a.detail}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Pharmacy status</CardTitle>
              <Link href="/app/pharmacies" className="text-sm font-medium text-primary hover:underline">Network</Link>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {pharmacies.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{p.type}</p>
                  </div>
                  <IntegrationBadge status={p.integrationStatus} />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
