"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input, Select } from "@/components/ui/misc";
import { calcAge, formatDate, initials } from "@/lib/utils";
import type { Patient } from "@/lib/types";

interface Row extends Patient {
  programName: string;
  providerName: string;
  pharmacyName: string;
  locationName: string;
}

const STATUS_VARIANT = {
  active: "success", onboarding: "default", paused: "warning", inactive: "muted",
} as const;

export function PatientsTable({ rows, programs }: { rows: Row[]; programs: string[] }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [program, setProgram] = useState("all");

  const filtered = useMemo(() => {
    const query = q.toLowerCase();
    return rows.filter((r) => {
      const matchesQ =
        !query ||
        `${r.firstName} ${r.lastName}`.toLowerCase().includes(query) ||
        r.email.toLowerCase().includes(query) ||
        r.providerName.toLowerCase().includes(query);
      const matchesStatus = status === "all" || r.status === status;
      const matchesProgram = program === "all" || r.programName === program;
      return matchesQ && matchesStatus && matchesProgram;
    });
  }, [rows, q, status, program]);

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search patients, providers, email…" className="pl-9" />
        </div>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="sm:w-44">
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="onboarding">Onboarding</option>
          <option value="paused">Paused</option>
          <option value="inactive">Inactive</option>
        </Select>
        <Select value={program} onChange={(e) => setProgram(e.target.value)} className="sm:w-52">
          <option value="all">All programs</option>
          {programs.map((p) => <option key={p} value={p}>{p}</option>)}
        </Select>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-subtle">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Patient</TableHead>
              <TableHead className="hidden md:table-cell">DOB</TableHead>
              <TableHead className="hidden lg:table-cell">Program</TableHead>
              <TableHead className="hidden lg:table-cell">Provider</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden xl:table-cell">Last Order</TableHead>
              <TableHead className="hidden xl:table-cell">Next Follow-Up</TableHead>
              <TableHead className="hidden md:table-cell">Location</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((p) => (
              <TableRow key={p.id} className="cursor-pointer">
                <TableCell>
                  <Link href={`/app/patients/${p.id}`} className="flex items-center gap-3">
                    <span className="flex size-9 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
                      {initials(`${p.firstName} ${p.lastName}`)}
                    </span>
                    <div>
                      <p className="font-medium leading-tight">{p.firstName} {p.lastName}</p>
                      <p className="text-xs text-muted-foreground">{p.state} · {p.pharmacyName}</p>
                    </div>
                  </Link>
                </TableCell>
                <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                  {formatDate(p.dob)} <span className="text-xs">({calcAge(p.dob)})</span>
                </TableCell>
                <TableCell className="hidden lg:table-cell text-sm">{p.programName}</TableCell>
                <TableCell className="hidden lg:table-cell text-sm">{p.providerName}</TableCell>
                <TableCell><Badge variant={STATUS_VARIANT[p.status]} className="capitalize">{p.status}</Badge></TableCell>
                <TableCell className="hidden xl:table-cell text-sm text-muted-foreground">{p.lastOrderAt ? formatDate(p.lastOrderAt) : "—"}</TableCell>
                <TableCell className="hidden xl:table-cell text-sm text-muted-foreground">{p.nextFollowUpAt ? formatDate(p.nextFollowUpAt) : "—"}</TableCell>
                <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{p.locationName}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {filtered.length === 0 && (
          <div className="px-4 py-12 text-center text-sm text-muted-foreground">No patients match your filters.</div>
        )}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{filtered.length} of {rows.length} patients · fictional demo data</p>
    </div>
  );
}
