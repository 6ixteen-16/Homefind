import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

interface RouteContext {
  params: { id: string };
}

const updateSchema = z.object({
  role: z.enum(["SUPER_ADMIN", "ADMIN", "AGENCY_ADMIN", "AGENT", "EDITOR", "VIEWER"]).optional(),
  isActive: z.boolean().optional(),
  name: z.string().min(2).optional(),
  phone: z.string().optional(),
  bio: z.string().optional(),
  agencyId: z.string().optional().nullable(),
});

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isGlobalAdmin = session.user.role === "SUPER_ADMIN" || session.user.role === "ADMIN";
  const isAgencyAdmin = session.user.role === "AGENCY_ADMIN";

  if (!isGlobalAdmin && !isAgencyAdmin) {
    return NextResponse.json({ error: "Forbidden — Access restricted to Administrators" }, { status: 403 });
  }

  const existing = await prisma.user.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Silo check
  if (!isGlobalAdmin && existing.agencyId !== session.user.agencyId) {
    return NextResponse.json({ error: "Forbidden — Agency mismatch" }, { status: 403 });
  }

  // Prevent modifying self via this route
  if (params.id === session.user.id) {
    return NextResponse.json(
      { error: "Use the Profile page to update your own account." },
      { status: 400 }
    );
  }

  const body = await request.json();
  const result = updateSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: params.id },
    data: {
      ...result.data,
      agencyId: isGlobalAdmin ? result.data.agencyId : existing.agencyId,
    },
    select: { id: true, name: true, email: true, role: true, isActive: true },
  });

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "USER_UPDATED",
      entityType: "User",
      entityId: params.id,
      newValue: result.data as any,
    },
  }).catch(() => {});

  return NextResponse.json({ success: true, user });
}
