"use client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/app/stat-card";
import { TrendArea, TrendLine, BarSeries, DonutChart } from "@/components/app/charts";
import { cn } from "@/lib/utils";

const RANGES = [
  { key: "7d", label: "7 days", months: 1 },
  { key: "30d", label: "30 days", months: 3 },
  { key: "90d", label: "90 days", months: 4 },
  { key: "12m", label: "12 months", months: 12 },
  { key: "custom", label: "Custom", months: 12 },
];

interface Props {
  trend: { label: string; orders: number; revenue: number }[];
  revenueByProgram: { name: string; color: string; revenue: number; patients: number }[];
  pharmacyUsage: { name: string; value: number; color: string }[];
  productUtil: { name: string; count: number; color?: string }[];
  locationPerf: { name: string; patients: number; orders: number; revenue: number }[];
  headline: { label: string; value: string; delta?: string }[];
}

export function AnalyticsDashboard({ trend, revenueByProgram, pharmacyUsage, productUtil, locationPerf, headline }: Props) {
  const [range, setRange] = useState("12m");
  const months = RANGES.find((r) => r.key === range)?.months ?? 12;
  const slicedTrend = trend.slice(-months);
  const usd = (v: number) => `$${v.toLocaleString()}`;

  return (
    <div>
      <div className="mb-6 inline-flex rounded-lg border border-border bg-card p-1 shadow-subtle">
        {RANGES.map((r) => (
          <button key={r.key} onClick={() => setRange(r.key)}
            className={cn("rounded-md px-3 py-1.5 text-sm font-medium transition-colors", range === r.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
            {r.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {headline.map((h) => <StatCard key={h.label} label={h.label} value={h.value} delta={h.delta} />)}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Orders per month</CardTitle></CardHeader>
          <CardContent><TrendArea data={slicedTrend} dataKey="orders" /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Revenue trend</CardTitle></CardHeader>
          <CardContent><TrendLine data={slicedTrend} fmt={usd} /></CardContent>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Revenue by program</CardTitle></CardHeader>
          <CardContent><BarSeries data={revenueByProgram} dataKey="revenue" fmt={usd} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Pharmacy usage</CardTitle></CardHeader>
          <CardContent className="pt-2"><DonutChart data={pharmacyUsage} /></CardContent>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Product utilization</CardTitle></CardHeader>
          <CardContent><BarSeries data={productUtil} dataKey="count" height={280} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Location performance</CardTitle></CardHeader>
          <CardContent className="pt-0">
            <div className="divide-y divide-border">
              {locationPerf.map((l) => (
                <div key={l.name} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium">{l.name}</p>
                    <p className="text-xs text-muted-foreground">{l.patients} patients · {l.orders} orders</p>
                  </div>
                  <p className="text-sm font-semibold tabular-nums">${l.revenue.toLocaleString()}/mo</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">Executive analytics · fictional demo data · figures are illustrative</p>
    </div>
  );
}
