import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import GlobalSearch from "@/shared/ui/components/GlobalSearch";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar role={session.user.role} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar title="Maniagro – Ingeniería de Procesos" />
        <main className="flex-1 overflow-y-auto bg-slate-50 p-6">
          {children}
        </main>
        <GlobalSearch />
      </div>
    </div>
  );
}
