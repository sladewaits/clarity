import Link from "next/link";
import { ArrowRight, MapPin, Clock, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IntegrationBadge, PharmacyTypeBadge } from "@/components/domain/badges";
import { getPharmacies } from "@/data/service";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Pharmacy Network" };

export default function PharmaciesPage() {
  const pharmacies = getPharmacies();

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader
        title="Pharmacy Network"
        description="Your approved pharmacy relationships in one place. Credentialing shown is provided by each pharmacy — Project Peptides surfaces it, and does not itself certify any pharmacy as safe."
      />

      <div className="mb-6 rounded-lg border border-border bg-accent/40 px-4 py-3 text-sm text-accent-foreground">
        <ShieldCheck className="mr-2 inline size-4" />
        Credential data is self-reported by each pharmacy and shown for transparency. This architecture is designed to ingest verification from authoritative sources in the future.
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {pharmacies.map((ph) => (
          <Link key={ph.id} href={`/app/pharmacies/${ph.id}`}>
            <Card className="group h-full transition-all hover:shadow-card hover:-translate-y-0.5">
              <CardContent className="flex h-full flex-col pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">{ph.name}</h3>
                    <div className="mt-1"><PharmacyTypeBadge type={ph.type} pathway={ph.pathway} /></div>
                  </div>
                  <IntegrationBadge status={ph.integrationStatus} />
                </div>
                <p className="mt-3 text-sm text-muted-foreground line-clamp-2">{ph.blurb}</p>

                <div className="mt-4 flex flex-wrap gap-1.5">
                  {ph.productCategories.slice(0, 4).map((c) => (
                    <Badge key={c} variant="secondary">{c}</Badge>
                  ))}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4 text-sm">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <MapPin className="size-3.5" /> {ph.statesServed.length} states
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="size-3.5" /> {ph.typicalFulfillmentDays[0]}–{ph.typicalFulfillmentDays[1]} days
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                  <span className="text-xs text-muted-foreground">Verified {formatDate(ph.lastCredentialCheck)}</span>
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-primary group-hover:gap-1.5 transition-all">
                    View profile <ArrowRight className="size-3.5" />
                  </span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
