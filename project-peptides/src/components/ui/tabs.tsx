"use client";
import { useState } from "react";
import { cn } from "@/lib/utils";

export interface TabDef {
  value: string;
  label: string;
  content: React.ReactNode;
  badge?: string | number;
}

export function Tabs({ tabs, defaultValue }: { tabs: TabDef[]; defaultValue?: string }) {
  const [active, setActive] = useState(defaultValue ?? tabs[0]?.value);
  return (
    <div>
      <div className="flex gap-1 overflow-x-auto border-b border-border no-scrollbar">
        {tabs.map((t) => (
          <button
            key={t.value}
            onClick={() => setActive(t.value)}
            className={cn(
              "relative whitespace-nowrap px-3.5 py-2.5 text-sm font-medium transition-colors",
              active === t.value ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <span className="flex items-center gap-1.5">
              {t.label}
              {t.badge != null && (
                <span className="rounded-full bg-muted px-1.5 text-xs text-muted-foreground">{t.badge}</span>
              )}
            </span>
            {active === t.value && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />}
          </button>
        ))}
      </div>
      <div className="pt-5">{tabs.find((t) => t.value === active)?.content}</div>
    </div>
  );
}
