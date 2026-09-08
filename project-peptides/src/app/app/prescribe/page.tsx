import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { PrescribeFlow, type PatientDTO } from "@/components/app/prescribe-flow";
import {
  getPatients, getProgram, getUser, getCanonicalProducts, getPharmacies,
} from "@/data/service";
import { db } from "@/data/mock";

export const metadata = { title: "New Prescription" };

export default function PrescribePage({ searchParams }: { searchParams: { patient?: string; sku?: string } }) {
  const patients: PatientDTO[] = getPatients()
    .filter((p) => p.status !== "inactive")
    .map((p) => {
      const provider = getUser(p.providerId);
      return {
        id: p.id,
        name: `${p.firstName} ${p.lastName}`,
        state: p.state,
        programName: p.programId ? getProgram(p.programId)?.name ?? "—" : "Unassigned",
        providerId: p.providerId,
        providerName: provider?.name ?? "—",
        providerLicenseStates: provider?.licenseStates ?? [],
      };
    });

  // patient-specific (503A) offers only for this workflow
  const offers = db.pharmacyProducts.filter((o) => o.pathway === "patient_specific");

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader
        title="New Prescription"
        description="Patient-specific (503A) workflow. This is a UX + integration abstraction — real transmission requires a compliant e-prescribing / pharmacy integration."
        actions={<Badge variant="warning">Simulated workflow</Badge>}
      />
      <PrescribeFlow
        patients={patients}
        products={getCanonicalProducts()}
        offers={offers}
        pharmacies={getPharmacies()}
        preselectPatientId={searchParams.patient}
        preselectSkuId={searchParams.sku}
      />
    </div>
  );
}
