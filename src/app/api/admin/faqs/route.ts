import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  question: z.string().min(3),
  answer: z.string().min(3),
  category: z.string().optional().nullable(),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

export async function GET() {
  const faqs = await prisma.fAQ.findMany({ orderBy: { sortOrder: "asc" } }).catch(() => []);
  return NextResponse.json({ faqs });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || !["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json();
  const result = schema.safeParse(body);
  if (!result.success) return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  const faq = await prisma.fAQ.create({ data: result.data });
  return NextResponse.json({ success: true, faq }, { status: 201 });
}
