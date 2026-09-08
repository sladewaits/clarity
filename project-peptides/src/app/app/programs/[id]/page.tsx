import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FlaskConical, GraduationCap, Users, CalendarClock, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/app/stat-card";
import { getProgram, getUser, getCanonicalProduct } from "@/data/service";
import { formatCurrency } from "@/lib/utils";

export default function ProgramDetail({ params }: { params: { id: string } }) {
  const program = getProgram(params.id);
  if (!program) notFound();

  return (
    <div className="mx-auto max-w-[1100px]">
      <Link href="/app/programs" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Programs
      </Link>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="size-4 rounded-full" style={{ background: program.color }} />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{program.name}</h1>
            <p className="text-sm text-muted-foreground">{program.category} · {program.followUpCadence}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Badge variant={program.status === "active" ? "success" : "muted"} className="capitalize self-center">{program.status}</Badge>
          <Button variant="outline">Edit program</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Enrolled patients" value={String(program.enrolledPatients)} />
        <StatCard label="Monthly price" value={formatCurrency(program.monthlyPriceCents, { cents: false })} />
        {program.kpis.slice(0, 2).map((k) => <StatCard key={k.label} label={k.label} value={k.value} delta={k.delta} />)}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><FlaskConical className="size-4 text-primary" /> Approved products</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2 pt-0">
            {program.productIds.map((pid) => {
              const cp = getCanonicalProduct(pid);
              return <Link key={pid} href={`/app/catalog/${pid}`}><Badge variant="secondary" className="hover:bg-accent">{cp?.name}</Badge></Link>;
            })}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Users className="size-4 text-primary" /> Providers</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-2 pt-0">
            {program.providerIds.map((id) => {
              const u = getUser(id);
              return <div key={id} className="text-sm">{u?.name} <span className="text-muted-foreground">· {u?.title}</span></div>;
            })}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><FlaskConical className="size-4 text-primary" /> Required labs</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2 pt-0">
            {program.requiredLabs.map((l) => <Badge key={l} variant="outline">{l}</Badge>)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><CalendarClock className="size-4 text-primary" /> Follow-up & KPIs</CardTitle></CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm"><span className="text-muted-foreground">Cadence:</span> {program.followUpCadence}</p>
            <div className="mt-3 space-y-1.5">
              {program.kpis.map((k) => (
                <div key={k.label} className="flex justify-between text-sm"><span className="text-muted-foreground">{k.label}</span><span className="font-medium">{k.value}</span></div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><GraduationCap className="size-4 text-primary" /> Education & staff training</CardTitle></CardHeader>
          <CardContent className="pt-0 text-sm text-muted-foreground">
            Assign onboarding and clinical modules to providers and staff for this program from the Education Center. Placeholder: link modules here.
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><FileText className="size-4 text-primary" /> Protocols & forms</CardTitle></CardHeader>
          <CardContent className="pt-0 text-sm text-muted-foreground">
            Clinical protocols, intake forms, and consent documents attach here. Clinical content requires medical review and approval before publication.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
