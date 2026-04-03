import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(2),
  title: z.string().min(2),
  bio: z.string().optional().nullable(),
  photo: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  linkedin: z.string().url().optional().nullable().or(z.literal("")),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

export async function GET() {
  const team = await prisma.teamMember.findMany({ orderBy: { sortOrder: "asc" } }).catch(() => []);
  return NextResponse.json({ team });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || !["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json();
  const result = schema.safeParse(body);
  if (!result.success) return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  const member = await prisma.teamMember.create({ data: result.data });
  return NextResponse.json({ success: true, member }, { status: 201 });
}
