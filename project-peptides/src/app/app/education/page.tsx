import { Clock, CheckCircle2, PlayCircle, Circle, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getEducationModules, getEducationCompletions, getTeam, getUser } from "@/data/service";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Education" };

const CATEGORIES = ["Clinical Education","Medication Education","Staff Training","Patient Communication","Operations","Compliance","Program Launch"];

export default function EducationPage() {
  const modules = getEducationModules();
  const completions = getEducationCompletions();
  const team = getTeam();

  // certification rows: completed modules with expiry
  const certs = completions
    .filter((c) => c.status === "completed" && c.certificateExpiresAt)
    .map((c) => ({
      user: getUser(c.userId)?.name ?? "—",
      module: modules.find((m) => m.id === c.moduleId)?.title ?? "—",
      expires: c.certificateExpiresAt!,
      expired: new Date(c.certificateExpiresAt!) < new Date(),
    }))
    .sort((a, b) => +new Date(a.expires) - +new Date(b.expires));

  const completedCount = completions.filter((c) => c.status === "completed").length;
  const completionRate = Math.round((completedCount / Math.max(1, completions.length)) * 100);

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader
        title="Education Center"
        description="A premium, versioned library for clinical education, staff training, patient communication, operations, and compliance."
        actions={<Button variant="outline">Assign modules</Button>}
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="p-5"><p className="text-xs uppercase tracking-wide text-muted-foreground">Modules</p><p className="mt-1 text-2xl font-semibold">{modules.length}</p></Card>
        <Card className="p-5"><p className="text-xs uppercase tracking-wide text-muted-foreground">Team completion</p><p className="mt-1 text-2xl font-semibold">{completionRate}%</p></Card>
        <Card className="p-5"><p className="text-xs uppercase tracking-wide text-muted-foreground">Staff tracked</p><p className="mt-1 text-2xl font-semibold">{team.length}</p></Card>
        <Card className="p-5"><p className="text-xs uppercase tracking-wide text-muted-foreground">Certs expiring</p><p className="mt-1 text-2xl font-semibold text-warning">{certs.filter((c) => c.expired || +new Date(c.expires) - Date.now() < 30 * 86400000).length}</p></Card>
      </div>

      {CATEGORIES.map((cat) => {
        const items = modules.filter((m) => m.category === cat);
        if (!items.length) return null;
        return (
          <div key={cat} className="mb-8">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{cat}</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {items.map((m) => {
                const mine = completions.find((c) => c.moduleId === m.id);
                const status = mine?.status ?? "assigned";
                const Icon = status === "completed" ? CheckCircle2 : status === "in_progress" ? PlayCircle : Circle;
                return (
                  <Card key={m.id} className="flex flex-col">
                    <CardContent className="flex flex-1 flex-col pt-5">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-medium leading-snug">{m.title}</h3>
                        <Icon className={status === "completed" ? "size-5 shrink-0 text-success" : status === "in_progress" ? "size-5 shrink-0 text-primary" : "size-5 shrink-0 text-muted-foreground"} />
                      </div>
                      <p className="mt-2 flex-1 text-sm text-muted-foreground line-clamp-2">{m.description}</p>
                      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1"><Clock className="size-3.5" /> {m.durationMin} min</span>
                        <span>· {m.version}</span>
                        <span>· reviewed {formatDate(m.lastReviewedAt)}</span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {m.audience.map((a) => <Badge key={a} variant="muted" className="capitalize">{a}</Badge>)}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="size-4 text-primary" /> Staff certification tracking</CardTitle></CardHeader>
        <CardContent className="pt-0">
          <Table>
            <TableHeader>
              <TableRow><TableHead>Staff</TableHead><TableHead>Certification</TableHead><TableHead>Expires</TableHead><TableHead>Status</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {certs.map((c, i) => (
                <TableRow key={i}>
                  <TableCell className="text-sm font-medium">{c.user}</TableCell>
                  <TableCell className="text-sm">{c.module}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(c.expires)}</TableCell>
                  <TableCell><Badge variant={c.expired ? "destructive" : "warning"}>{c.expired ? "Expired" : "Renew soon"}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {certs.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No certifications expiring.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
