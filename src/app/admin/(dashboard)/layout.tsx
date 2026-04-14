import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminTopBar } from "@/components/admin/AdminTopBar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/admin/login");
  }

  const allowedRoles = ["SUPER_ADMIN", "ADMIN", "AGENT", "EDITOR", "VIEWER"];
  if (!allowedRoles.includes(session.user.role)) {
    redirect("/");
  }

  return (
    <div className="flex h-screen bg-navy-950 overflow-hidden">
      {/* Sidebar */}
      <AdminSidebar user={session.user} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminTopBar user={session.user} />
        <main
          id="admin-main"
          className="flex-1 overflow-y-auto bg-background p-6 lg:p-8"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
