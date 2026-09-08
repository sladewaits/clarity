"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input, Select } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { OrderStatusBadge } from "@/components/domain/badges";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { OrderStatus } from "@/lib/types";

export interface OrderRow {
  id: string; ref: string; patientName: string; productName: string; strength: string;
  pharmacyName: string; type: string; status: OrderStatus; totalCents: number; createdAt: string; isDemo: boolean;
}

export function OrdersTable({ rows }: { rows: OrderRow[] }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [type, setType] = useState("all");

  const filtered = useMemo(() => {
    const query = q.toLowerCase();
    return rows.filter((r) => {
      const mQ = !query || r.ref.toLowerCase().includes(query) || r.patientName.toLowerCase().includes(query) || r.productName.toLowerCase().includes(query);
      const mS = status === "all" || r.status === status;
      const mT = type === "all" || r.type === type;
      return mQ && mS && mT;
    });
  }, [rows, q, status, type]);

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by ref, patient, product…" className="pl-9" />
        </div>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="sm:w-48">
          <option value="all">All statuses</option>
          {["provider_review","submitted","accepted","processing","compounding","quality_review","shipped","delivered","exception","cancelled"].map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
          ))}
        </Select>
        <Select value={type} onChange={(e) => setType(e.target.value)} className="sm:w-40">
          <option value="all">All pathways</option>
          <option value="503A">503A</option>
          <option value="503B">503B</option>
        </Select>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-subtle">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Patient</TableHead>
              <TableHead className="hidden lg:table-cell">Product</TableHead>
              <TableHead className="hidden lg:table-cell">Pharmacy</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden md:table-cell text-right">Total</TableHead>
              <TableHead className="hidden xl:table-cell">Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((o) => (
              <TableRow key={o.id}>
                <TableCell>
                  <Link href={`/app/orders/${o.id}`} className="flex items-center gap-2 font-mono text-sm font-medium">
                    {o.ref}
                    {o.isDemo && <Badge variant="warning" className="font-sans">Demo</Badge>}
                  </Link>
                </TableCell>
                <TableCell className="text-sm">{o.patientName}</TableCell>
                <TableCell className="hidden lg:table-cell text-sm">{o.productName} <span className="text-muted-foreground">{o.strength}</span></TableCell>
                <TableCell className="hidden lg:table-cell text-sm">
                  <span className="inline-flex items-center gap-1.5">{o.pharmacyName} <Badge variant="muted" className="font-mono text-[10px]">{o.type}</Badge></span>
                </TableCell>
                <TableCell><OrderStatusBadge status={o.status} /></TableCell>
                <TableCell className="hidden md:table-cell text-right text-sm tabular-nums">{formatCurrency(o.totalCents)}</TableCell>
                <TableCell className="hidden xl:table-cell text-sm text-muted-foreground">{formatDate(o.createdAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {filtered.length === 0 && <div className="px-4 py-12 text-center text-sm text-muted-foreground">No orders match your filters.</div>}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{filtered.length} of {rows.length} orders · fictional demo data</p>
    </div>
  );
}
