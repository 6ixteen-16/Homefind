import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { sendEmail } from "@/lib/email";
import { baseEmailTemplate } from "@/lib/email";
import Papa from "papaparse";

// ===== GET /api/admin/inquiries =====
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = request.nextUrl;
  const format = searchParams.get("format");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const pageSize = 20;
  const isAgent = session.user.role === "AGENT";

  const where = {
    isSpam: false,
    ...(isAgent ? { assignedToId: session.user.id } : {}),
  };

  if (format === "csv") {
    const inquiries = await prisma.inquiry.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        property: { select: { title: true } },
        assignedTo: { select: { name: true } },
      },
    });

    const csvData = inquiries.map((i) => ({
      ID: i.id,
      Name: i.name,
      Email: i.email,
      Phone: i.phone || "",
      Type: i.type,
      Property: i.property?.title || "",
      Status: i.status,
      "Assigned To": i.assignedTo?.name || "",
      Message: i.message.replace(/\n/g, " "),
      Date: i.createdAt.toISOString(),
    }));

    const csv = Papa.unparse(csvData);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="inquiries-${Date.now()}.csv"`,
      },
    });
  }

  const [total, inquiries] = await Promise.all([
    prisma.inquiry.count({ where }),
    prisma.inquiry.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        property: { select: { id: true, slug: true, title: true } },
        assignedTo: { select: { id: true, name: true } },
        _count: { select: { notes: true, replies: true } },
      },
    }),
  ]);

  return NextResponse.json({
    inquiries,
    meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
  });
}

// ===== PATCH /api/admin/inquiries/[id] =====
export async function PATCH_INQUIRY(request: NextRequest, id: string, userId: string) {
  const updateSchema = z.object({
    status: z.enum(["NEW", "IN_PROGRESS", "AWAITING_CLIENT", "CLOSED_WON", "CLOSED_LOST", "SPAM"]).optional(),
    assignedToId: z.string().optional().nullable(),
    isSpam: z.boolean().optional(),
  });

  const body = await request.json();
  const result = updateSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  const existing = await prisma.inquiry.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data = result.data;
  const updated = await prisma.inquiry.update({
    where: { id },
    data: {
      ...data,
      closedAt: (data.status === "CLOSED_WON" || data.status === "CLOSED_LOST")
        ? new Date()
        : undefined,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId,
      action: "INQUIRY_UPDATED",
      entityType: "Inquiry",
      entityId: id,
      prevValue: { status: existing.status } as any,
      newValue: { status: updated.status } as any,
    },
  });

  return NextResponse.json({ success: true, inquiry: updated });
}
