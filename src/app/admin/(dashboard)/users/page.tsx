import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AdminUsersClient } from "@/components/admin/AdminUsersClient";

export const metadata: Metadata = { title: "User Management — Admin" };
export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const session = await auth();
  if (!session?.user) return null;

  // Only Super Admin can access user management
  if (session.user.role !== "SUPER_ADMIN") {
    redirect("/admin");
  }

  const [users, agencies] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        photo: true,
        agencyId: true,
        _count: {
          select: { listings: true, assignedInquiries: true },
        },
      },
    }),
    prisma.agency.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } })
  ]).catch(() => [[], []]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-display-sm font-light text-foreground">
            User Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {users.length} user{users.length !== 1 ? "s" : ""} total
          </p>
        </div>
      </div>
      <AdminUsersClient 
        users={users as any} 
        agencies={agencies} 
        currentUserId={session.user.id} 
      />
    </div>
  );
}
