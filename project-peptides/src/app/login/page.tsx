import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { BrandLogo } from "@/components/brand/brand-logo";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/misc";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* form */}
      <div className="flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-20">
        <div className="mx-auto w-full max-w-sm">
          <Link href="/" className="inline-flex"><BrandLogo variant="horizontal" tone="dark-on-light" size={34} /></Link>
          <h1 className="mt-10 text-2xl font-semibold tracking-tight text-primary">Sign in to your clinic</h1>
          <p className="mt-1 text-sm text-muted-foreground">Welcome back. Access your program operating system.</p>

          <div className="mt-8 space-y-4">
            <div><Label>Work email</Label><Input className="mt-1" type="email" placeholder="you@clinic.health" defaultValue="owner@apex-longevity.health" /></div>
            <div>
              <div className="flex items-center justify-between"><Label>Password</Label><span className="text-xs text-primary">Forgot?</span></div>
              <Input className="mt-1" type="password" placeholder="••••••••" defaultValue="demo-account" />
            </div>
            <Link href="/app" className="block"><Button className="w-full">Sign in <ArrowRight className="size-4" /></Button></Link>
          </div>

          <div className="mt-6 rounded-lg border border-border bg-muted/40 p-4 text-sm">
            <p className="font-medium">Demo access</p>
            <p className="mt-1 text-muted-foreground">No credentials required. This MVP uses an auth adapter compatible with Auth0 / Clerk; no real authentication is performed.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href="/app"><Button size="sm" variant="outline">Enter clinic demo →</Button></Link>
              <Link href="/admin"><Button size="sm" variant="ghost">Admin console →</Button></Link>
            </div>
          </div>
        </div>
      </div>

      {/* brand panel — Deep Petrol */}
      <div className="relative hidden overflow-hidden bg-primary text-primary-foreground lg:block">
        <div className="grain absolute inset-0 opacity-30" />
        <div className="relative flex h-full flex-col justify-between p-16">
          <BrandLogo variant="horizontal" tone="white-on-petrol" size={32} />
          <div>
            <p className="font-serif text-4xl leading-[1.15] tracking-tight text-balance">
              The operating system for modern specialty care.
            </p>
            <p className="mt-5 max-w-md text-lg text-primary-foreground/75">
              Independent practices. A stronger tomorrow.
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-primary-foreground/60">
            <ShieldCheck className="size-4" /> Built for HIPAA-readiness · RBAC · audit logging architecture
          </div>
        </div>
      </div>
    </div>
  );
}
