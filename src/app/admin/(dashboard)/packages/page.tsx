import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AdminPackagesClient } from "@/components/admin/AdminPackagesClient";

export const metadata: Metadata = { title: "Listing Packages — Admin" };
export const dynamic = "force-dynamic";

export default async function AdminPackagesPage() {
  const session = await auth();
  if (!session?.user) return null;

  if (session.user.role !== "SUPER_ADMIN") {
    redirect("/admin");
  }

  const packages = await prisma.listingPackage.findMany({
    orderBy: { price: "asc" },
    include: {
      _count: {
        select: { agencies: true },
      },
    },
  }).catch(() => []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-display-sm font-light text-foreground">
            Listing Packages
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage subscription plans for Property Masters
          </p>
        </div>
      </div>
      <AdminPackagesClient packages={packages as any} />
    </div>
  );
}
