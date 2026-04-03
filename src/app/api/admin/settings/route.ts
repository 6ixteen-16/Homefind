import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const settingsSchema = z.object({
  siteName: z.string().min(1).optional(),
  tagline: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  whatsappNumber: z.string().optional(),
  facebookUrl: z.string().optional(),
  instagramUrl: z.string().optional(),
  linkedinUrl: z.string().optional(),
  twitterUrl: z.string().optional(),
  notificationEmail: z.string().optional(),
  ga4MeasurementId: z.string().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const settings = await prisma.siteSettings.findUnique({
    where: { id: "singleton" },
  }).catch(() => null);

  return NextResponse.json({ settings });
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user || !["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const result = settingsSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  const settings = await prisma.siteSettings.upsert({
    where: { id: "singleton" },
    update: result.data,
    create: { id: "singleton", ...result.data },
  });

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "SETTINGS_UPDATED",
      entityType: "SiteSettings",
      entityId: "singleton",
    },
  }).catch(() => {});

  return NextResponse.json({ success: true, settings });
}
