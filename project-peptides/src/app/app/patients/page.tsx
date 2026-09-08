import { Plus } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { PatientsTable } from "@/components/app/patients-table";
import { getPatients, getProgram, getUser, getLocation, getPharmacy, getPrograms } from "@/data/service";

export const metadata = { title: "Patients" };

export default function PatientsPage() {
  const patients = getPatients();
  const rows = patients.map((p) => ({
    ...p,
    programName: p.programId ? getProgram(p.programId)?.name.replace(" Program", "") ?? "—" : "Unassigned",
    providerName: getUser(p.providerId)?.name ?? "—",
    pharmacyName: p.preferredPharmacyId ? getPharmacy(p.preferredPharmacyId)?.name.split(" ")[0] ?? "—" : "—",
    locationName: getLocation(p.locationId)?.city ?? "—",
  }));
  const programs = [...new Set(getPrograms().map((p) => p.name.replace(" Program", "")))];

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader
        title="Patients"
        description="Manage patients across your organization. Clinical detail is separated from administrative detail on each profile."
        actions={<Button><Plus className="size-4" /> Add patient</Button>}
      />
      <PatientsTable rows={rows} programs={programs} />
    </div>
  );
}
