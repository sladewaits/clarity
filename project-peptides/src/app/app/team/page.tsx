import { UserPlus, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/misc";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CredentialBadge } from "@/components/domain/badges";
import { getTeam, getLocation } from "@/data/service";
import { ROLE_LABELS, permissionsFor } from "@/lib/rbac";
import type { RoleKey } from "@/lib/types";

export const metadata = { title: "Team" };

const ROLE_VARIANT: Record<RoleKey, "default" | "secondary" | "muted"> = {
  org_owner: "default", provider: "secondary", clinic_staff: "muted", pp_admin: "default",
};

export default function TeamPage() {
  const team = getTeam();
  const roles: RoleKey[] = ["org_owner", "provider", "clinic_staff"];

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader
        title="Team"
        description="Manage users, roles, and permissions. Role-based access control is enforced throughout — staff never inherit provider-only clinical permissions."
        actions={<Button><UserPlus className="size-4" /> Invite member</Button>}
      />

      <Card className="mb-6">
        <CardHeader><CardTitle className="text-base">Members</CardTitle></CardHeader>
        <CardContent className="pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead><TableHead>Role</TableHead>
                <TableHead className="hidden md:table-cell">Locations</TableHead>
                <TableHead className="hidden lg:table-cell">Credential</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {team.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar name={u.name} />
                      <div><p className="text-sm font-medium">{u.name}</p><p className="text-xs text-muted-foreground">{u.title} · {u.email}</p></div>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant={ROLE_VARIANT[u.role]}>{ROLE_LABELS[u.role]}</Badge></TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {u.locationIds.map((id) => getLocation(id)?.city).filter(Boolean).join(", ") || "All"}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">{u.credentialStatus ? <CredentialBadge status={u.credentialStatus} /> : <span className="text-xs text-muted-foreground">—</span>}</TableCell>
                  <TableCell><Badge variant={u.active ? "success" : "muted"}>{u.active ? "Active" : "Inactive"}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground"><ShieldCheck className="size-4" /> Role permissions</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {roles.map((r) => (
            <Card key={r}>
              <CardHeader><CardTitle className="text-base">{ROLE_LABELS[r]}</CardTitle></CardHeader>
              <CardContent className="flex flex-wrap gap-1.5 pt-0">
                {permissionsFor(r).map((p) => <Badge key={p} variant="muted" className="font-mono text-[10px]">{p}</Badge>)}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
