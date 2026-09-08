"use client";
import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

const LINKS = [
  { label: "Platform", href: "/platform" },
  { label: "Pharmacy Network", href: "/pharmacy-network" },
  { label: "Programs", href: "/programs-overview" },
  { label: "Education", href: "/education-overview" },
  { label: "For Clinics", href: "/for-clinics" },
  { label: "Security", href: "/security" },
  { label: "About", href: "/about" },
];

export function MarketingNav() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/"><Logo subtle /></Link>
        <nav className="hidden items-center gap-6 lg:flex">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">{l.label}</Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 lg:flex">
          <Link href="/login"><Button variant="ghost" size="sm">Login</Button></Link>
          <Link href="/book-demo"><Button size="sm">Book a Demo</Button></Link>
        </div>
        <button className="rounded-md p-2 hover:bg-muted lg:hidden" onClick={() => setOpen((v) => !v)} aria-label="Menu">
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>
      {open && (
        <div className="border-t border-border bg-background lg:hidden">
          <div className="flex flex-col gap-1 p-4">
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">{l.label}</Link>
            ))}
            <div className="mt-2 flex gap-2">
              <Link href="/login" className="flex-1"><Button variant="outline" className="w-full">Login</Button></Link>
              <Link href="/book-demo" className="flex-1"><Button className="w-full">Book a Demo</Button></Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

export function MarketingFooter() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-4 lg:px-8">
        <div className="md:col-span-1">
          <Logo />
          <p className="mt-4 max-w-xs text-sm text-muted-foreground">The operating system for modern longevity medicine.</p>
        </div>
        <FooterCol title="Platform" links={[["Overview","/platform"],["Pharmacy Network","/pharmacy-network"],["Programs","/programs-overview"],["Education","/education-overview"]]} />
        <FooterCol title="Company" links={[["For Clinics","/for-clinics"],["Security","/security"],["About","/about"],["Book a Demo","/book-demo"]]} />
        <FooterCol title="Product" links={[["Sign in","/login"],["Clinic demo","/app"],["Admin console","/admin"]]} />
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} Project Peptides. Fictional demo product. Not a pharmacy. Not medical advice.</p>
          <p>Licensed clinicians remain responsible for prescribing. Licensed pharmacies remain responsible for dispensing.</p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <p className="text-sm font-semibold">{title}</p>
      <ul className="mt-3 space-y-2">
        {links.map(([label, href]) => (
          <li key={href}><Link href={href} className="text-sm text-muted-foreground hover:text-foreground">{label}</Link></li>
        ))}
      </ul>
    </div>
  );
}
