import { Sidebar } from "@/components/app/sidebar";
import { Topbar } from "@/components/app/topbar";
import { getCurrentUser } from "@/data/service";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const user = getCurrentUser();
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar role={user.role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar user={{ name: user.name, title: user.title, role: user.role }} />
        <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
