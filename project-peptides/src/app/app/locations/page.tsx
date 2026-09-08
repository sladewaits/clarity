import { MapPin, Users, Package, Building2 } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/app/stat-card";
import { getCurrentOrg, getLocations, getOrders, getProviders } from "@/data/service";
import { formatCompactCurrency, formatCurrency } from "@/lib/utils";

export const metadata = { title: "Locations" };

export default function LocationsPage() {
  const org = getCurrentOrg();
  const locations = getLocations();
  const orders = getOrders();
  const totalRev = locations.reduce((s, l) => s + l.monthlyRevenueCents, 0);

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader
        title="Locations"
        description={`Corporate roll-up for ${org.name}. Location managers see only their authorized locations; corporate administrators see all.`}
        actions={<Button variant="outline"><Building2 className="size-4" /> Add location</Button>}
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Locations" value={String(locations.length)} />
        <StatCard label="Combined patients" value={String(locations.reduce((s, l) => s + l.activePatients, 0))} />
        <StatCard label="Combined orders" value={String(orders.length)} />
        <StatCard label="Combined monthly revenue" value={formatCompactCurrency(totalRev)} delta="+11%" />
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {locations.map((loc) => {
          const locOrders = orders.filter((o) => o.locationId === loc.id).length;
          const share = Math.round((loc.monthlyRevenueCents / totalRev) * 100);
          return (
            <Card key={loc.id}>
              <CardHeader className="flex-row items-start justify-between">
                <div>
                  <CardTitle className="text-base">{loc.city}, {loc.state}</CardTitle>
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="size-3" /> {loc.addressLine}</p>
                </div>
                <Badge variant="secondary">{share}% of revenue</Badge>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-3 gap-3 border-t border-border pt-4 text-center">
                  <div><p className="flex items-center justify-center gap-1 text-lg font-semibold"><Users className="size-4 text-muted-foreground" />{loc.activePatients}</p><p className="text-[11px] text-muted-foreground">Patients</p></div>
                  <div><p className="flex items-center justify-center gap-1 text-lg font-semibold"><Package className="size-4 text-muted-foreground" />{locOrders}</p><p className="text-[11px] text-muted-foreground">Orders</p></div>
                  <div><p className="text-lg font-semibold tabular-nums">{formatCurrency(loc.monthlyRevenueCents, { cents: false })}</p><p className="text-[11px] text-muted-foreground">/ month</p></div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="mt-6">
        <CardHeader><CardTitle className="text-base">Corporate controls</CardTitle></CardHeader>
        <CardContent className="grid gap-3 pt-0 sm:grid-cols-2 lg:grid-cols-3">
          {["Approve products across locations","Approve pharmacy relationships","Assign programs to locations","Compare location performance","Control staff permissions","View purchasing behavior"].map((c) => (
            <div key={c} className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-sm">
              <span className="size-1.5 rounded-full bg-primary" /> {c}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
