import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/misc";

export const metadata = { title: "Admin Console" };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-sidebar-border bg-primary text-primary-foreground">
        <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-4 lg:px-8">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="inline-flex items-center">
              <BrandLogo variant="horizontal" tone="white-on-petrol" size={28} />
            </Link>
            <Badge variant="default" className="border border-white/20 bg-white/10 text-primary-foreground">Admin Console</Badge>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/app" className="text-primary-foreground/70 hover:text-primary-foreground">Clinic view</Link>
            <div className="flex items-center gap-2">
              <span className="hidden sm:block text-primary-foreground/90">Jordan Vance</span>
              <Avatar name="Jordan Vance" className="bg-white/15 text-primary-foreground ring-white/20" />
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1400px] px-4 py-8 lg:px-8">{children}</main>
    </div>
  );
}
