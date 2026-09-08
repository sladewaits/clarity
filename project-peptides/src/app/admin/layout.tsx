import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/misc";

export const metadata = { title: "Admin Console" };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-foreground text-background">
        <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-4 lg:px-8">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="flex items-center gap-2">
              <span className="text-[15px] font-semibold tracking-tight">Project Peptides</span>
            </Link>
            <Badge variant="default" className="bg-background/15 text-background">Admin Console</Badge>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/app" className="text-background/70 hover:text-background">Clinic view</Link>
            <div className="flex items-center gap-2">
              <span className="hidden sm:block text-background/90">Jordan Vance</span>
              <Avatar name="Jordan Vance" className="bg-background/15 text-background ring-background/20" />
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1400px] px-4 py-8 lg:px-8">{children}</main>
    </div>
  );
}
