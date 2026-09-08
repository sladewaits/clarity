"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Search, SlidersHorizontal, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { RegulatoryBadge } from "@/components/domain/badges";
import { formatCurrency } from "@/lib/utils";
import type { CanonicalProduct, PharmacyType } from "@/lib/types";

export interface CatalogRowDTO {
  id: string;
  name: string;
  category: string;
  form: string;
  route: string;
  regulatoryStatus: CanonicalProduct["regulatoryStatus"];
  lowestPriceCents: number | null;
  fastestDays: number | null;
  pharmacyCount: number;
  types: PharmacyType[];
}

export function CatalogBrowser({ rows, initialQuery = "" }: { rows: CatalogRowDTO[]; initialQuery?: string }) {
  const [q, setQ] = useState(initialQuery);
  const [category, setCategory] = useState("all");
  const [form, setForm] = useState("all");
  const [pathway, setPathway] = useState("all"); // 503A | 503B
  const [avail, setAvail] = useState("all");
  const [sort, setSort] = useState("relevance");

  const categories = useMemo(() => [...new Set(rows.map((r) => r.category))].sort(), [rows]);
  const forms = useMemo(() => [...new Set(rows.map((r) => r.form))].sort(), [rows]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    let out = rows.filter((r) => {
      const mQ = !query || r.name.toLowerCase().includes(query) || r.category.toLowerCase().includes(query) || r.form.toLowerCase().includes(query) || r.route.toLowerCase().includes(query);
      const mCat = category === "all" || r.category === category;
      const mForm = form === "all" || r.form === form;
      const mPath = pathway === "all" || r.types.includes(pathway as PharmacyType);
      const mAvail =
        avail === "all" ||
        (avail === "available" && r.regulatoryStatus === "available") ||
        (avail === "verification" && (r.regulatoryStatus === "verification_required" || r.regulatoryStatus === "restricted")) ||
        (avail === "blocked" && r.regulatoryStatus === "not_available_compounded");
      return mQ && mCat && mForm && mPath && mAvail;
    });
    if (sort === "price") out = [...out].sort((a, b) => (a.lowestPriceCents ?? Infinity) - (b.lowestPriceCents ?? Infinity));
    if (sort === "fulfillment") out = [...out].sort((a, b) => (a.fastestDays ?? Infinity) - (b.fastestDays ?? Infinity));
    if (sort === "name") out = [...out].sort((a, b) => a.name.localeCompare(b.name));
    return out;
  }, [rows, q, category, form, pathway, avail, sort]);

  return (
    <div>
      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search the formulary — try “sermorelin”, “weight”, “injectable”…"
          className="h-12 w-full rounded-xl border border-input bg-card pl-11 pr-4 text-base shadow-subtle placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><SlidersHorizontal className="size-3.5" /> Filters</span>
        <Select value={category} onChange={(e) => setCategory(e.target.value)} className="w-auto min-w-[130px]">
          <option value="all">All categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
        <Select value={pathway} onChange={(e) => setPathway(e.target.value)} className="w-auto min-w-[110px]">
          <option value="all">503A & 503B</option>
          <option value="503A">503A</option>
          <option value="503B">503B</option>
        </Select>
        <Select value={form} onChange={(e) => setForm(e.target.value)} className="w-auto min-w-[120px]">
          <option value="all">All forms</option>
          {forms.map((f) => <option key={f} value={f}>{f}</option>)}
        </Select>
        <Select value={avail} onChange={(e) => setAvail(e.target.value)} className="w-auto min-w-[150px]">
          <option value="all">All availability</option>
          <option value="available">Available</option>
          <option value="verification">Needs verification</option>
          <option value="blocked">Not orderable</option>
        </Select>
        <Select value={sort} onChange={(e) => setSort(e.target.value)} className="ml-auto w-auto min-w-[150px]">
          <option value="relevance">Sort: Relevance</option>
          <option value="price">Sort: Price</option>
          <option value="fulfillment">Sort: Fulfillment</option>
          <option value="name">Sort: Name</option>
        </Select>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((r) => {
          const orderable = r.regulatoryStatus === "available";
          return (
            <Link key={r.id} href={`/app/catalog/${r.id}`}>
              <Card className="group h-full transition-all hover:shadow-card hover:-translate-y-0.5">
                <CardContent className="flex h-full flex-col pt-5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{r.category}</p>
                      <h3 className="text-base font-semibold leading-tight">{r.name}</h3>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {r.types.map((t) => <Badge key={t} variant={t === "503A" ? "default" : "secondary"} className="font-mono text-[10px]">{t}</Badge>)}
                    </div>
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">{r.form} · {r.route}</p>

                  <div className="mt-4 flex items-end justify-between border-t border-border pt-3">
                    {orderable ? (
                      <div>
                        <p className="text-lg font-semibold tabular-nums">{r.lowestPriceCents != null ? formatCurrency(r.lowestPriceCents) : "—"}</p>
                        <p className="text-xs text-muted-foreground">from {r.pharmacyCount} {r.pharmacyCount === 1 ? "pharmacy" : "pharmacies"}{r.fastestDays ? ` · ${r.fastestDays}d+` : ""}</p>
                      </div>
                    ) : (
                      <RegulatoryBadge status={r.regulatoryStatus} />
                    )}
                    <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
      {filtered.length === 0 && (
        <div className="rounded-xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
          No products match your search.
        </div>
      )}
      <p className="mt-4 text-xs text-muted-foreground">{filtered.length} products · mock pricing · availability is determined per pharmacy and jurisdiction</p>
    </div>
  );
}
