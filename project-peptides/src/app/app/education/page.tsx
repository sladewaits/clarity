import { Clock, CheckCircle2, Users, GraduationCap } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/misc";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getEducationModules, getEducationCompletions, getTeam, getUser } from "@/data/service";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Education" };

const CATEGORY_ORDER = [
  "Clinical Education", "Medication Education", "Compliance",
  "Staff Training", "Patient Communication", "Operations", "Program Launch",
];

const LEARNER = {
  completed: { label: "Completed", pct: 100, tint: "hsl(var(--success))" },
  in_progress: { label: "In progress", pct: 55, tint: "hsl(var(--accent-strong))" },
  assigned: { label: "Not started", pct: 0, tint: "hsl(var(--muted-foreground))" },
} as const;

export default function EducationPage() {
  const modules = getEducationModules();
  const completions = getEducationCompletions();
  const team = getTeam();

  const renewals = completions
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
  const renewalsDue = renewals.filter((r) => r.expired || +new Date(r.expires) - Date.now() < 30 * 86400000).length;

  const summary = [
    { label: "Courses", value: String(modules.length) },
    { label: "Team completion", value: `${completionRate}%` },
    { label: "Staff tracked", value: String(team.length) },
    { label: "Renewals due", value: String(renewalsDue) },
  ];

  return (
    <div className="mx-auto max-w-[1100px]">
      <PageHeader
        title="Education Center"
        description="A structured library for clinical education, staff training, patient communication, operations, and compliance."
        actions={<Button variant="outline">Assign courses</Button>}
      />

      {/* quiet summary strip */}
      <div className="mb-8 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border shadow-subtle sm:grid-cols-4">
        {summary.map((s) => (
          <div key={s.label} className="bg-card px-5 py-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{s.label}</p>
            <p className="mt-1.5 text-xl font-semibold tabular-nums text-foreground">{s.value}</p>
          </div>
        ))}
      </div>

      {/* content-status legend */}
      <p className="mb-6 flex items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="warning">Demo — clinical review pending</Badge>
        All course content is demonstration material and has not completed clinical review.
      </p>

      <div className="space-y-8">
        {CATEGORY_ORDER.map((cat) => {
          const items = modules.filter((m) => m.category === cat);
          if (!items.length) return null;
          return (
            <section key={cat}>
              <div className="mb-3 flex items-baseline justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-primary">{cat}</h2>
                <span className="text-xs text-muted-foreground">{items.length} {items.length === 1 ? "course" : "courses"}</span>
              </div>
              <Card>
                <div className="divide-y divide-border">
                  {items.map((m) => {
                    const mine = completions.find((c) => c.moduleId === m.id);
                    const state = LEARNER[(mine?.status ?? "assigned") as keyof typeof LEARNER];
                    return (
                      <div key={m.id} className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <h3 className="text-[15px] font-semibold text-foreground">{m.title}</h3>
                          <p className="mt-1 text-sm text-muted-foreground">{m.description}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1"><Clock className="size-3.5" /> {m.durationMin} min</span>
                            <span aria-hidden>·</span>
                            <span className="inline-flex items-center gap-1"><Users className="size-3.5" /> {m.audience.join(", ")}</span>
                            <Badge variant="warning">Demo — review pending</Badge>
                          </div>
                        </div>
                        <div className="w-full shrink-0 sm:w-44">
                          <div className="flex items-center justify-between text-xs">
                            <span className="inline-flex items-center gap-1 font-medium text-foreground">
                              {state.label === "Completed" && <CheckCircle2 className="size-3.5 text-success" />}
                              {state.label}
                            </span>
                          </div>
                          <Progress value={state.pct} tint={state.tint} className="mt-1.5 h-1.5" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </section>
          );
        })}
      </div>

      <Card className="mt-10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><GraduationCap className="size-4 text-primary" /> Training completion &amp; renewals</CardTitle>
          <p className="text-sm text-muted-foreground">Internal training records for the team. Not a professional certification or accreditation.</p>
        </CardHeader>
        <CardContent className="pt-0">
          <Table>
            <TableHeader>
              <TableRow><TableHead>Staff</TableHead><TableHead>Course</TableHead><TableHead>Renewal due</TableHead><TableHead>Status</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {renewals.map((c, i) => (
                <TableRow key={i}>
                  <TableCell className="text-sm font-medium">{c.user}</TableCell>
                  <TableCell className="text-sm">{c.module}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(c.expires)}</TableCell>
                  <TableCell><Badge variant={c.expired ? "destructive" : "warning"}>{c.expired ? "Overdue" : "Renew soon"}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {renewals.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No renewals due.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
