import { PageHeader } from "@/components/app/page-header";
import { CatalogBrowser, type CatalogRowDTO } from "@/components/app/catalog-browser";
import { getCatalog } from "@/data/service";
import type { PharmacyType } from "@/lib/types";

export const metadata = { title: "Catalog" };

export default function CatalogPage({ searchParams }: { searchParams: { q?: string } }) {
  const rows: CatalogRowDTO[] = getCatalog().map(({ product, offers, lowestPriceCents, fastestDays, pharmacyCount }) => ({
    id: product.id,
    name: product.name,
    category: product.category,
    form: product.defaultForm,
    route: product.defaultRoute,
    regulatoryStatus: product.regulatoryStatus,
    lowestPriceCents,
    fastestDays,
    pharmacyCount,
    types: [...new Set(offers.map((o) => o.type))] as PharmacyType[],
  }));

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader
        title="Catalog"
        description="One searchable formulary across every connected pharmacy. Pricing is mock; availability is determined by the pharmacy and jurisdiction — not assumed."
      />
      <CatalogBrowser rows={rows} initialQuery={searchParams.q ?? ""} />
    </div>
  );
}
