import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { sendEmail } from "@/lib/email";
import { baseEmailTemplate } from "@/lib/email";

interface RouteContext {
  params: { id: string };
}

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const inquiry = await prisma.inquiry.findUnique({
    where: { id: params.id },
    include: {
      property: { select: { id: true, slug: true, title: true, city: true } },
      assignedTo: { select: { id: true, name: true, email: true, photo: true } },
      notes: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { id: true, name: true, photo: true } } },
      },
      replies: {
        orderBy: { sentAt: "asc" },
        include: { sentBy: { select: { id: true, name: true, photo: true } } },
      },
    },
  });

  if (!inquiry) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (session.user.role === "AGENT" && inquiry.assignedToId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ inquiry });
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const updateSchema = z.object({
    status: z.enum(["NEW", "IN_PROGRESS", "AWAITING_CLIENT", "CLOSED_WON", "CLOSED_LOST", "SPAM"]).optional(),
    assignedToId: z.string().optional().nullable(),
    isSpam: z.boolean().optional(),
    note: z.string().max(2000).optional(), // Add a note inline
  });

  const body = await request.json();
  const result = updateSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: "Validation failed", details: result.error.flatten() }, { status: 400 });
  }

  const { note, ...data } = result.data;
  const existing = await prisma.inquiry.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (session.user.role === "AGENT" && existing.assignedToId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (note) {
      await tx.inquiryNote.create({
        data: { inquiryId: params.id, authorId: session.user.id, content: note },
      });
    }

    return tx.inquiry.update({
      where: { id: params.id },
      data: {
        ...data,
        closedAt: ["CLOSED_WON", "CLOSED_LOST"].includes(data.status || "")
          ? new Date()
          : undefined,
      },
    });
  });

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "INQUIRY_UPDATED",
      entityType: "Inquiry",
      entityId: params.id,
      prevValue: { status: existing.status } as any,
      newValue: { status: updated.status } as any,
    },
  });

  return NextResponse.json({ success: true, inquiry: updated });
}
