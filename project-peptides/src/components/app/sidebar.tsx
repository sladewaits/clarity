"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Icon } from "./icon";
import { APP_NAV } from "./nav";
import { canAny } from "@/lib/rbac";
import type { RoleKey } from "@/lib/types";
import { cn } from "@/lib/utils";

export function Sidebar({ role }: { role: RoleKey }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/app" ? pathname === "/app" : pathname.startsWith(href);

  const nav = (
    <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-4 no-scrollbar">
      {APP_NAV.map((section, i) => {
        const items = section.items.filter((it) => !it.requires || canAny(role, it.requires));
        if (!items.length) return null;
        return (
          <div key={i} className="flex flex-col gap-1">
            {section.title && (
              <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70">
                {section.title}
              </p>
            )}
            {items.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon name={item.icon} className={cn("size-[18px]", active ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* mobile top bar */}
      <div className="flex items-center justify-between border-b border-border bg-card px-4 py-3 lg:hidden">
        <Logo subtle />
        <button onClick={() => setOpen(true)} className="rounded-md p-2 hover:bg-muted" aria-label="Open menu">
          <Menu className="size-5" />
        </button>
      </div>

      {/* mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-foreground/20" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 flex h-full w-72 flex-col bg-card shadow-lift">
            <div className="flex items-center justify-between border-b border-border px-4 py-4">
              <Logo />
              <button onClick={() => setOpen(false)} className="rounded-md p-2 hover:bg-muted"><X className="size-5" /></button>
            </div>
            {nav}
          </aside>
        </div>
      )}

      {/* desktop rail */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card lg:flex">
        <div className="border-b border-border px-5 py-5">
          <Link href="/app"><Logo /></Link>
        </div>
        {nav}
        <div className="border-t border-border p-3">
          <Link href="/" className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground">
            ← Back to marketing site
          </Link>
        </div>
      </aside>
    </>
  );
}
