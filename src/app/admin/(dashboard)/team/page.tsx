import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Image from "next/image";
import { Users } from "lucide-react";
import { AdminTeamClient } from "@/components/admin/AdminTeamClient";

export const metadata: Metadata = { title: "Team Members — Admin" };
export const dynamic = "force-dynamic";

export default async function AdminTeamPage() {
  const session = await auth();
  if (!session?.user) return null;

  const team = await prisma.teamMember.findMany({
    orderBy: { sortOrder: "asc" },
  }).catch(() => []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-display-sm font-light text-foreground">
          Team Members
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage the team displayed on the About Us page.
        </p>
      </div>
      <AdminTeamClient team={team} />
    </div>
  );
}
