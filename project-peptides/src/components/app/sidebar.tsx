"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { BrandLogo } from "@/components/brand/brand-logo";
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
              <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-sidebar-muted">
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
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-muted hover:bg-white/[0.06] hover:text-sidebar-foreground",
                  )}
                >
                  {active && <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-accent-strong" />}
                  <Icon
                    name={item.icon}
                    className={cn("size-[18px]", active ? "text-accent-strong" : "text-sidebar-muted group-hover:text-sidebar-foreground")}
                  />
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
      <div className="flex items-center justify-between border-b border-sidebar-border bg-sidebar px-4 py-3 lg:hidden">
        <BrandLogo variant="horizontal" tone="white-on-petrol" size={26} />
        <button onClick={() => setOpen(true)} className="rounded-md p-2 text-sidebar-foreground hover:bg-white/10" aria-label="Open menu">
          <Menu className="size-5" />
        </button>
      </div>

      {/* mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-foreground/40" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 flex h-full w-72 flex-col bg-sidebar text-sidebar-foreground shadow-lift">
            <div className="flex items-center justify-between border-b border-sidebar-border px-4 py-4">
              <BrandLogo variant="horizontal" tone="white-on-petrol" size={30} />
              <button onClick={() => setOpen(false)} className="rounded-md p-2 text-sidebar-foreground hover:bg-white/10" aria-label="Close menu"><X className="size-5" /></button>
            </div>
            {nav}
          </aside>
        </div>
      )}

      {/* desktop rail */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex">
        <div className="border-b border-sidebar-border px-5 py-5">
          <Link href="/app" className="inline-flex rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring">
            <BrandLogo variant="horizontal" tone="white-on-petrol" size={32} />
          </Link>
        </div>
        {nav}
        <div className="border-t border-sidebar-border p-3">
          <Link href="/" className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-sidebar-muted hover:bg-white/[0.06] hover:text-sidebar-foreground">
            ← Back to marketing site
          </Link>
        </div>
      </aside>
    </>
  );
}
