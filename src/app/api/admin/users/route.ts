import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isGlobalAdmin = session.user.role === "SUPER_ADMIN" || session.user.role === "ADMIN";
  const isAgencyAdmin = session.user.role === "AGENCY_ADMIN";

  if (!isGlobalAdmin && !isAgencyAdmin) {
    return NextResponse.json({ error: "Forbidden — Access restricted to Administrators" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    where: !isGlobalAdmin ? { agencyId: session.user.agencyId } : {},
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
      _count: { select: { listings: true, assignedInquiries: true } },
    },
  }).catch(() => []);

  return NextResponse.json({ users });
}
