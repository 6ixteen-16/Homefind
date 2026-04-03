import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyTurnstile, getClientIp } from "@/lib/utils";
import { sendEmail } from "@/lib/email";
import { InquiryNotificationEmail, InquiryConfirmationEmail } from "@/emails/InquiryNotificationEmail";

const contactSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().optional(),
  subject: z.string().min(1).max(200),
  message: z.string().min(20).max(2000),
  turnstileToken: z.string().min(1),
  honeypot: z.string().max(0).optional(),
});

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  // Rate limit: 3 per hour
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (entry && entry.resetAt > now && entry.count >= 3) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }
  if (!entry || entry.resetAt <= now) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 3600_000 });
  } else {
    entry.count++;
  }

  try {
    const body = await request.json();
    const result = contactSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: "Validation failed", details: result.error.flatten() }, { status: 400 });
    }

    const { turnstileToken, honeypot, ...data } = result.data;
    if (honeypot) return NextResponse.json({ success: true });

    const valid = await verifyTurnstile(turnstileToken);
    if (!valid) return NextResponse.json({ error: "Security verification failed." }, { status: 400 });

    const settings = await prisma.siteSettings.findUnique({
      where: { id: "singleton" },
      select: { notificationEmail: true, siteName: true },
    });

    const inquiry = await prisma.inquiry.create({
      data: {
        type: "GENERAL",
        name: data.name,
        email: data.email.toLowerCase(),
        phone: data.phone,
        subject: data.subject,
        message: data.message,
        ipAddress: ip,
      },
    });

    const siteName = settings?.siteName || "Prestige Properties";
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
    const notifEmail = settings?.notificationEmail || process.env.ADMIN_EMAIL;

    if (notifEmail) {
      sendEmail({
        to: notifEmail,
        subject: `New contact form: ${data.subject}`,
        html: InquiryNotificationEmail({
          inquiry: { ...inquiry, propertyTitle: null },
          siteName,
          dashboardUrl: `${siteUrl}/admin/inquiries/${inquiry.id}`,
        }),
      }).catch(console.error);
    }

    sendEmail({
      to: data.email,
      subject: `We received your message — ${siteName}`,
      html: InquiryConfirmationEmail({ name: data.name, propertyTitle: null, siteName, siteUrl }),
    }).catch(console.error);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[POST /api/contact]", error);
    return NextResponse.json({ error: "Failed to send message." }, { status: 500 });
  }
}
