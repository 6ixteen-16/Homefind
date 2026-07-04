import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AdminAgenciesClient } from "@/components/admin/AdminAgenciesClient";

export const metadata: Metadata = { title: "Agency Management — Admin" };
export const dynamic = "force-dynamic";

export default async function AdminAgenciesPage() {
  const session = await auth();
  if (!session?.user) return null;

  // Only Super Admin can access agency management
  if (session.user.role !== "SUPER_ADMIN") {
    redirect("/admin");
  }

  const agencies = await prisma.agency.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { users: true, properties: true },
      },
    },
  }).catch(() => []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-display-sm font-light text-foreground">
            Agency Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {agencies.length} propery master{agencies.length !== 1 ? "s" : ""} registered
          </p>
        </div>
      </div>
      <AdminAgenciesClient agencies={agencies as any} />
    </div>
  );
}
