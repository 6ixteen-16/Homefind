import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

interface RouteContext {
  params: { id: string };
}

const updateSchema = z.object({
  role: z.enum(["SUPER_ADMIN", "ADMIN", "AGENT", "EDITOR", "VIEWER"]).optional(),
  isActive: z.boolean().optional(),
  name: z.string().min(2).optional(),
  phone: z.string().optional(),
  bio: z.string().optional(),
});

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    data: result.data,
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
