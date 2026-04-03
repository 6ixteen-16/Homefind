import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  clientName: z.string().min(2),
  clientTitle: z.string().optional().nullable(),
  clientPhoto: z.string().optional().nullable(),
  rating: z.number().int().min(1).max(5).default(5),
  text: z.string().min(10),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

export async function GET() {
  const items = await prisma.testimonial.findMany({ orderBy: { sortOrder: "asc" } }).catch(() => []);
  return NextResponse.json({ testimonials: items });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || !["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json();
  const result = schema.safeParse(body);
  if (!result.success) return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  const item = await prisma.testimonial.create({ data: result.data });
  return NextResponse.json({ success: true, testimonial: item }, { status: 201 });
}
