import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  name:           z.string().min(2).optional(),
  logoUrl:        z.string().url().optional().nullable(),
  address:        z.string().optional().nullable(),
  contactEmail:   z.string().email().optional().nullable(),
  verifiedStatus: z.boolean().optional(),
});

interface RouteContext {
  params: { id: string };
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const result = updateSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: "Validation failed" }, { status: 400 });
    }

    const existing = await prisma.agency.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const agency = await prisma.agency.update({
      where: { id: params.id },
      data: result.data,
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "AGENCY_UPDATED",
        entityType: "Agency",
        entityId: params.id,
        newValue: result.data as any,
      },
    }).catch(() => {});

    return NextResponse.json({ success: true, agency });
  } catch (error) {
    console.error(`[PATCH /api/admin/agencies/${params.id}]`, error);
    return NextResponse.json({ error: "Failed to update agency" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const existing = await prisma.agency.findUnique({ 
      where: { id: params.id },
      include: { _count: { select: { properties: true } } }
    });
    
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Prevent deletion if agency has properties
    if (existing._count.properties > 0) {
      return NextResponse.json({ 
        error: "Cannot delete agency with active listings. Reassign or delete properties first." 
      }, { status: 400 });
    }

    await prisma.agency.delete({
      where: { id: params.id },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "AGENCY_DELETED",
        entityType: "Agency",
        entityId: params.id,
        prevValue: { name: existing.name } as any,
      },
    }).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`[DELETE /api/admin/agencies/${params.id}]`, error);
    return NextResponse.json({ error: "Failed to delete agency" }, { status: 500 });
  }
}
