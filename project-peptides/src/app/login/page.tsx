import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* form */}
      <div className="flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-20">
        <div className="mx-auto w-full max-w-sm">
          <Link href="/"><Logo /></Link>
          <h1 className="mt-10 text-2xl font-semibold tracking-tight">Sign in to your clinic</h1>
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

      {/* brand panel */}
      <div className="relative hidden overflow-hidden bg-foreground text-background lg:block">
        <div className="grain absolute inset-0 opacity-40" />
        <div className="relative flex h-full flex-col justify-between p-16">
          <div />
          <div>
            <Badge className="bg-background/15 text-background">APEX LONGEVITY · Jacksonville, FL</Badge>
            <p className="mt-6 text-3xl font-semibold leading-tight tracking-tight text-balance">
              “Project Peptides runs our program.”
            </p>
            <p className="mt-4 max-w-md text-background/70">
              One platform for pharmacy connectivity, program operations, education, patient fulfillment, and growth.
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-background/60">
            <ShieldCheck className="size-4" /> Built for HIPAA-readiness · RBAC · audit logging architecture
          </div>
        </div>
      </div>
    </div>
  );
}
