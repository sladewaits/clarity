import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Stethoscope, ClipboardList, FlaskConical, FileText, Clock, StickyNote, Pill } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";
import { OrderStatusBadge } from "@/components/domain/badges";
import {
  getPatient, getPatientOrders, getProgram, getUser, getLocation, getPharmacy, getCanonicalProduct,
} from "@/data/service";
import { calcAge, formatCurrency, formatDate, initials } from "@/lib/utils";

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm">{value}</dd>
    </div>
  );
}

function SectionLabel({ icon: Icon, tone, children }: { icon: any; tone: "clinical" | "admin"; children: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <span className={tone === "clinical" ? "flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary" : "flex size-7 items-center justify-center rounded-md bg-secondary text-secondary-foreground"}>
        <Icon className="size-4" />
      </span>
      <h3 className="text-sm font-semibold">{children}</h3>
      <Badge variant={tone === "clinical" ? "default" : "muted"} className="ml-1">{tone === "clinical" ? "Clinical" : "Administrative"}</Badge>
    </div>
  );
}

export default function PatientProfile({ params }: { params: { id: string } }) {
  const patient = getPatient(params.id);
  if (!patient) notFound();
  const program = patient.programId ? getProgram(patient.programId) : null;
  const provider = getUser(patient.providerId);
  const location = getLocation(patient.locationId);
  const pharmacy = patient.preferredPharmacyId ? getPharmacy(patient.preferredPharmacyId) : null;
  const orders = getPatientOrders(patient.id);
  const prescriptions = orders.filter((o) => o.status !== "cancelled");

  const fullName = `${patient.firstName} ${patient.lastName}`;

  const overview = (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card>
        <CardContent className="pt-6">
          <SectionLabel icon={ClipboardList} tone="admin">Administrative</SectionLabel>
          <dl className="grid grid-cols-2 gap-4">
            <Field label="Email" value={patient.email} />
            <Field label="Phone" value={patient.phone} />
            <Field label="Location" value={location?.name.replace("Apex Longevity — ", "") ?? "—"} />
            <Field label="Home state" value={patient.state} />
            <Field label="Preferred pharmacy" value={pharmacy?.name ?? "—"} />
            <Field label="Patient since" value={formatDate(patient.createdAt)} />
          </dl>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <SectionLabel icon={Stethoscope} tone="clinical">Clinical</SectionLabel>
          <dl className="grid grid-cols-2 gap-4">
            <Field label="DOB / Age" value={`${formatDate(patient.dob)} · ${calcAge(patient.dob)}y`} />
            <Field label="Sex" value={patient.sex} />
            <Field label="Program" value={program?.name ?? "Unassigned"} />
            <Field label="Provider" value={provider?.name ?? "—"} />
            <Field label="Next follow-up" value={patient.nextFollowUpAt ? formatDate(patient.nextFollowUpAt) : "—"} />
            <Field label="Status" value={<span className="capitalize">{patient.status}</span>} />
          </dl>
        </CardContent>
      </Card>
    </div>
  );

  const treatment = (
    <Card>
      <CardContent className="pt-6">
        {program ? (
          <div>
            <div className="flex items-center gap-3">
              <span className="size-3 rounded-full" style={{ background: program.color }} />
              <h3 className="text-lg font-semibold">{program.name}</h3>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{program.description}</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="Follow-up cadence" value={program.followUpCadence} />
              <Field label="Required labs" value={program.requiredLabs.join(", ")} />
            </div>
            <div className="mt-5">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Approved products</p>
              <div className="flex flex-wrap gap-2">
                {program.productIds.map((pid) => (
                  <Badge key={pid} variant="secondary">{getCanonicalProduct(pid)?.name}</Badge>
                ))}
              </div>
            </div>
            <div className="mt-6 rounded-lg border border-dashed border-border bg-muted/40 p-4 text-sm text-muted-foreground">
              Clinical protocols and dosing are placeholders pending medical review and approval. Project Peptides does not provide dosing recommendations.
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">This patient is not enrolled in a program.</p>
        )}
      </CardContent>
    </Card>
  );

  const rxTable = (title: string) => (
    <Card>
      <CardContent className="pt-6">
        {prescriptions.length ? (
          <div className="divide-y divide-border">
            {prescriptions.map((o) => {
              const cp = getCanonicalProduct(o.canonicalProductId);
              return (
                <Link key={o.id} href={`/app/orders/${o.id}`} className="flex items-center justify-between gap-3 py-3 -mx-2 px-2 rounded-lg hover:bg-muted/60">
                  <div className="flex items-center gap-3">
                    <span className="flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground"><Pill className="size-4" /></span>
                    <div>
                      <p className="text-sm font-medium">{cp?.name} · {o.strength}</p>
                      <p className="text-xs text-muted-foreground font-mono">{o.ref} · {getPharmacy(o.pharmacyId)?.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="hidden text-sm text-muted-foreground tabular-nums sm:block">{formatCurrency(o.priceCents + o.shippingCents)}</span>
                    <OrderStatusBadge status={o.status} />
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">No {title.toLowerCase()} yet.</p>
        )}
      </CardContent>
    </Card>
  );

  const labs = (
    <Card><CardContent className="pt-6">
      <div className="rounded-lg border border-dashed border-border bg-muted/40 p-6 text-center">
        <FlaskConical className="mx-auto size-6 text-muted-foreground" />
        <p className="mt-2 text-sm font-medium">Labs integration placeholder</p>
        <p className="mt-1 text-sm text-muted-foreground">Required labs for this patient&apos;s program: {program?.requiredLabs.join(", ") ?? "—"}. Results would sync from a connected lab/EHR integration.</p>
      </div>
    </CardContent></Card>
  );

  const documents = (
    <Card><CardContent className="pt-6">
      <div className="divide-y divide-border">
        {["Consent — Program Enrollment", "Financial Agreement", "Photo ID (redacted)", "Telehealth Consent"].map((d) => (
          <div key={d} className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3"><FileText className="size-4 text-muted-foreground" /><span className="text-sm">{d}</span></div>
            <Badge variant="success">On file</Badge>
          </div>
        ))}
      </div>
    </CardContent></Card>
  );

  const timeline = (
    <Card><CardContent className="pt-6">
      <ol className="relative ml-3 border-l border-border">
        {[
          { t: "Program enrollment", d: formatDate(patient.createdAt) },
          ...(patient.lastOrderAt ? [{ t: "Most recent order", d: formatDate(patient.lastOrderAt) }] : []),
          ...(patient.nextFollowUpAt ? [{ t: "Upcoming follow-up", d: formatDate(patient.nextFollowUpAt) }] : []),
        ].map((e, i) => (
          <li key={i} className="mb-5 ml-5">
            <span className="absolute -left-[7px] mt-1 size-3 rounded-full border-2 border-background bg-primary" />
            <p className="text-sm font-medium">{e.t}</p>
            <p className="text-xs text-muted-foreground">{e.d}</p>
          </li>
        ))}
      </ol>
    </CardContent></Card>
  );

  const notes = (
    <Card><CardContent className="pt-6">
      <div className="rounded-lg border border-dashed border-border bg-muted/40 p-6 text-center text-sm text-muted-foreground">
        <StickyNote className="mx-auto size-6" />
        <p className="mt-2">Clinical notes are restricted to providers (RBAC: <span className="font-mono">clinical:notes</span>). Demo data only.</p>
      </div>
    </CardContent></Card>
  );

  return (
    <div className="mx-auto max-w-[1400px]">
      <Link href="/app/patients" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> All patients
      </Link>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span className="flex size-14 items-center justify-center rounded-full bg-accent text-lg font-semibold text-accent-foreground">{initials(fullName)}</span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{fullName}</h1>
            <p className="text-sm text-muted-foreground">{calcAge(patient.dob)}y · {patient.state} · {program?.name ?? "No program"} · {provider?.name}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/app/prescribe?patient=${patient.id}`}><Button><Pill className="size-4" /> New prescription</Button></Link>
          <Button variant="outline">Message</Button>
        </div>
      </div>

      <Tabs
        tabs={[
          { value: "overview", label: "Overview", content: overview },
          { value: "treatment", label: "Treatment Program", content: treatment },
          { value: "prescriptions", label: "Prescriptions", badge: prescriptions.length, content: rxTable("Prescriptions") },
          { value: "orders", label: "Orders", badge: orders.length, content: rxTable("Orders") },
          { value: "labs", label: "Labs", content: labs },
          { value: "documents", label: "Documents", content: documents },
          { value: "timeline", label: "Timeline", content: timeline },
          { value: "notes", label: "Notes", content: notes },
        ]}
      />
    </div>
  );
}
