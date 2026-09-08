"use client";
import { useState } from "react";
import { Plus, Send } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/misc";
import type { SupportTicket } from "@/lib/types";
import { cn, formatDateTime, relativeTime } from "@/lib/utils";

const PRIORITY = { low: "muted", normal: "secondary", high: "warning", urgent: "destructive" } as const;
const STATUS = { open: "default", in_progress: "warning", waiting: "secondary", resolved: "success" } as const;

export function SupportCenter({ tickets }: { tickets: SupportTicket[] }) {
  const [activeId, setActiveId] = useState(tickets[0]?.id);
  const active = tickets.find((t) => t.id === activeId);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_1fr]">
      <div>
        <Button className="mb-3 w-full"><Plus className="size-4" /> New ticket</Button>
        <div className="flex flex-col gap-2">
          {tickets.map((t) => (
            <button key={t.id} onClick={() => setActiveId(t.id)}
              className={cn("rounded-xl border px-4 py-3 text-left transition-colors", activeId === t.id ? "border-primary bg-accent" : "border-border bg-card hover:bg-muted")}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs text-muted-foreground">{t.ref}</span>
                <Badge variant={STATUS[t.status]} className="capitalize">{t.status.replace("_", " ")}</Badge>
              </div>
              <p className="mt-1 text-sm font-medium leading-snug line-clamp-1">{t.subject}</p>
              <div className="mt-1.5 flex items-center gap-2">
                <Badge variant={PRIORITY[t.priority]} className="capitalize">{t.priority}</Badge>
                <span className="text-xs text-muted-foreground capitalize">{t.category}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {active ? (
        <Card className="flex flex-col">
          <div className="border-b border-border p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">{active.subject}</h2>
                <p className="mt-1 text-sm text-muted-foreground font-mono">{active.ref} · assigned to {active.assignee}</p>
              </div>
              <div className="flex gap-2">
                <Badge variant={PRIORITY[active.priority]} className="capitalize">{active.priority}</Badge>
                <Badge variant={STATUS[active.status]} className="capitalize">{active.status.replace("_", " ")}</Badge>
              </div>
            </div>
          </div>
          <CardContent className="flex-1 space-y-4 pt-5">
            {active.messages.map((msg, i) => (
              <div key={i} className={cn("flex", msg.role === "pp" ? "justify-start" : "justify-end")}>
                <div className={cn("max-w-[80%] rounded-2xl px-4 py-2.5", msg.role === "pp" ? "bg-muted" : "bg-primary text-primary-foreground")}>
                  <p className="text-sm">{msg.body}</p>
                  <p className={cn("mt-1 text-[11px]", msg.role === "pp" ? "text-muted-foreground" : "text-primary-foreground/70")}>{msg.author} · {relativeTime(msg.at)}</p>
                </div>
              </div>
            ))}
          </CardContent>
          <div className="border-t border-border p-4">
            <div className="flex items-end gap-2">
              <Textarea placeholder="Write a reply…" className="min-h-[44px]" />
              <Button className="shrink-0"><Send className="size-4" /></Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Audit history is retained for every ticket. Demo data — replies are not persisted.</p>
          </div>
        </Card>
      ) : (
        <Card><CardContent className="py-16 text-center text-sm text-muted-foreground">Select a ticket.</CardContent></Card>
      )}
    </div>
  );
}
