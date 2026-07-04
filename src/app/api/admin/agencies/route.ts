import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const agencySchema = z.object({
  name:           z.string().min(2),
  logoUrl:        z.string().url().optional().nullable(),
  address:        z.string().optional().nullable(),
  contactEmail:   z.string().email().optional().nullable(),
  verifiedStatus: z.boolean().default(false),
});

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const agencies = await prisma.agency.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { users: true, properties: true },
        },
      },
    });

    return NextResponse.json({ agencies });
  } catch (error) {
    console.error("[GET /api/admin/agencies]", error);
    return NextResponse.json({ error: "Failed to fetch agencies" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const result = agencySchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: "Validation failed", details: result.error.flatten() }, { status: 400 });
    }

    const agency = await prisma.agency.create({
      data: result.data,
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "AGENCY_CREATED",
        entityType: "Agency",
        entityId: agency.id,
        newValue: agency as any,
      },
    }).catch(() => {});

    return NextResponse.json({ success: true, agency }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/admin/agencies]", error);
    return NextResponse.json({ error: "Failed to create agency" }, { status: 500 });
  }
}
