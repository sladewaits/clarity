/**
 * Derived analytics/metrics for dashboards. Pure functions over the service
 * layer so they can be memoized or moved to SQL aggregates later.
 */
import type { Order, OrderStatus } from "@/lib/types";
import {
  CURRENT_ORG_ID,
  getAllLocations,
  getAllOrders,
  getAllOrganizations,
  getAllPatients,
  getLocations,
  getOrders,
  getPatients,
  getPharmacies,
  getPrograms,
  getProviders,
} from "./service";

const FULFILLING: OrderStatus[] = ["accepted", "processing", "compounding", "quality_review"];

export function homeMetrics(orgId = CURRENT_ORG_ID) {
  const patients = getPatients(orgId);
  const orders = getOrders(orgId);
  const now = new Date();
  const monthOrders = orders.filter((o) => {
    const d = new Date(o.createdAt);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const revenue = orders
    .filter((o) => ["delivered", "shipped", ...FULFILLING].includes(o.status))
    .reduce((s, o) => s + o.priceCents + o.shippingCents, 0);

  const deliveredWithTime = orders.filter((o) => o.status === "delivered" && o.timeline.length >= 2);
  const avgFulfillHours =
    deliveredWithTime.reduce((s, o) => {
      const start = +new Date(o.timeline[0].at);
      const end = +new Date(o.timeline[o.timeline.length - 1].at);
      return s + (end - start) / 3600000;
    }, 0) / Math.max(1, deliveredWithTime.length);

  return {
    activePatients: patients.filter((p) => p.status === "active").length,
    ordersThisMonth: monthOrders.length,
    pendingPrescriptions: orders.filter((o) => o.status === "provider_review" || o.status === "submitted").length,
    inFulfillment: orders.filter((o) => FULFILLING.includes(o.status)).length,
    delivered: orders.filter((o) => o.status === "delivered").length,
    monthlyRevenueCents: Math.round(revenue),
    avgFulfillDays: +(avgFulfillHours / 24).toFixed(1),
    retentionPct: 89,
    exceptions: orders.filter((o) => o.status === "exception").length,
  };
}

export function ordersByMonth(orders: Order[], months = 12) {
  const buckets: { label: string; orders: number; revenue: number }[] = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({ label: d.toLocaleString("en-US", { month: "short" }), orders: 0, revenue: 0 });
  }
  const base = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1).getTime();
  for (const o of orders) {
    const d = new Date(o.createdAt);
    const idx = (d.getFullYear() - new Date(base).getFullYear()) * 12 + d.getMonth() - new Date(base).getMonth();
    if (idx >= 0 && idx < buckets.length) {
      buckets[idx].orders += 1;
      buckets[idx].revenue += (o.priceCents + o.shippingCents) / 100;
    }
  }
  return buckets;
}

export function revenueByProgram(orgId = CURRENT_ORG_ID) {
  const programs = getPrograms(orgId);
  const patients = getPatients(orgId);
  return programs
    .map((prog) => {
      const enrolled = patients.filter((p) => p.programId === prog.id).length;
      return {
        name: prog.name.replace(" Program", ""),
        color: prog.color,
        revenue: Math.round((enrolled * prog.monthlyPriceCents) / 100),
        patients: enrolled,
      };
    })
    .sort((a, b) => b.revenue - a.revenue);
}

export function pharmacyUsage(orgId = CURRENT_ORG_ID) {
  const orders = getOrders(orgId);
  const pharmacies = getPharmacies();
  return pharmacies
    .map((ph) => ({
      name: ph.name.split(" ")[0],
      value: orders.filter((o) => o.pharmacyId === ph.id).length,
      color: ph.type === "503A" ? "#0E7C86" : "#5B6ABF",
    }))
    .filter((p) => p.value > 0)
    .sort((a, b) => b.value - a.value);
}

export function productUtilization(orgId = CURRENT_ORG_ID) {
  const orders = getOrders(orgId);
  const counts = new Map<string, number>();
  for (const o of orders) counts.set(o.canonicalProductId, (counts.get(o.canonicalProductId) ?? 0) + 1);
  return [...counts.entries()]
    .map(([cpId, count]) => ({ cpId, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

export function locationPerformance(orgId = CURRENT_ORG_ID) {
  const locations = getLocations(orgId);
  const orders = getOrders(orgId);
  return locations.map((loc) => ({
    name: loc.city,
    patients: loc.activePatients,
    orders: orders.filter((o) => o.locationId === loc.id).length,
    revenue: Math.round(loc.monthlyRevenueCents / 100),
  }));
}

export function platformMetrics() {
  const orgs = getAllOrganizations();
  const orders = getAllOrders();
  const now = new Date();
  const monthly = orders.filter((o) => {
    const d = new Date(o.createdAt);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  return {
    clinics: orgs.length,
    locations: getAllLocations().length,
    providers: orgs.reduce((s, o) => s + getProviders(o.id).length, 0),
    patients: getAllPatients().length,
    monthlyOrders: monthly.length,
    platformRevenueCents: orgs.length * 140000,
    pharmacyVolume: orders.length,
  };
}
