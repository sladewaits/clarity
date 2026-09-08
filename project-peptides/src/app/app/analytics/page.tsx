import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { AnalyticsDashboard } from "@/components/app/analytics-dashboard";
import { getOrders, getCanonicalProduct } from "@/data/service";
import {
  homeMetrics, ordersByMonth, revenueByProgram, pharmacyUsage, productUtilization, locationPerformance,
} from "@/data/metrics";
import { formatCompactCurrency } from "@/lib/utils";

export const metadata = { title: "Analytics" };

// Brand categorical palette — Deep Petrol / Clinical Teal anchored, restrained warmth
const PALETTE = ["#0F3B52", "#00C2B3", "#2E6E8E", "#C2683A", "#4E8A6B", "#7A5A86", "#B0894F", "#5A6B72"];

export default function AnalyticsPage() {
  const m = homeMetrics();
  const trend = ordersByMonth(getOrders(), 12);
  const util = productUtilization().map((u, i) => ({
    name: getCanonicalProduct(u.cpId)?.name.split(" ")[0] ?? "—",
    count: u.count,
    color: PALETTE[i % PALETTE.length],
  }));

  const headline = [
    { label: "Active patients", value: String(m.activePatients), delta: "+6%" },
    { label: "Avg. patient value", value: "$412/mo", delta: "+4%" },
    { label: "Patient retention", value: `${m.retentionPct}%`, delta: "+2%" },
    { label: "Est. monthly revenue", value: formatCompactCurrency(m.monthlyRevenueCents), delta: "+14%" },
    { label: "Avg. fulfillment", value: `${m.avgFulfillDays}d`, delta: "-0.3d" },
    { label: "Order exceptions", value: String(m.exceptions), delta: "Low", delta_tone: "neutral" } as any,
    { label: "Orders (mo)", value: String(m.ordersThisMonth), delta: "+12%" },
    { label: "In fulfillment", value: String(m.inFulfillment) },
  ];

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader
        title="Analytics"
        description="Executive-friendly analytics across patients, revenue, fulfillment, pharmacies, products, and locations."
        actions={<Button variant="outline">Export</Button>}
      />
      <AnalyticsDashboard
        trend={trend}
        revenueByProgram={revenueByProgram()}
        pharmacyUsage={pharmacyUsage()}
        productUtil={util}
        locationPerf={locationPerformance()}
        headline={headline}
      />
    </div>
  );
}
