import Link from "next/link";
import { Plus, ArrowRight, Users } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getPrograms, getUser } from "@/data/service";
import { formatCurrency } from "@/lib/utils";

export const metadata = { title: "Programs" };

export default function ProgramsPage() {
  const programs = getPrograms();
  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader
        title="Programs"
        description="Design and run treatment programs — approved products, providers, education, labs, follow-up cadence, and KPIs in one place."
        actions={<Button><Plus className="size-4" /> New program</Button>}
      />
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {programs.map((p) => (
          <Link key={p.id} href={`/app/programs/${p.id}`}>
            <Card className="group h-full transition-all hover:shadow-card hover:-translate-y-0.5">
              <div className="h-1.5 rounded-t-xl" style={{ background: p.color }} />
              <CardContent className="flex h-full flex-col pt-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">{p.name}</h3>
                    <p className="text-xs text-muted-foreground">{p.category}</p>
                  </div>
                  <Badge variant={p.status === "active" ? "success" : "muted"} className="capitalize">{p.status}</Badge>
                </div>
                <p className="mt-3 flex-1 text-sm text-muted-foreground line-clamp-2">{p.description}</p>
                <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-4 text-center">
                  <div><p className="text-lg font-semibold tabular-nums">{p.enrolledPatients}</p><p className="text-[11px] text-muted-foreground">Enrolled</p></div>
                  <div><p className="text-lg font-semibold tabular-nums">{p.productIds.length}</p><p className="text-[11px] text-muted-foreground">Products</p></div>
                  <div><p className="text-lg font-semibold tabular-nums">{formatCurrency(p.monthlyPriceCents, { cents: false })}</p><p className="text-[11px] text-muted-foreground">/ mo</p></div>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Users className="size-3.5" /> {p.providerIds.map((id) => getUser(id)?.name.replace("Dr. ", "")).filter(Boolean).slice(0,2).join(", ")}</span>
                  <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
