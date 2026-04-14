import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyTurnstile, getClientIp } from "@/lib/utils";
import { sendEmail } from "@/lib/email";
import { InquiryNotificationEmail, InquiryConfirmationEmail } from "@/emails/InquiryNotificationEmail";

const inquirySchema = z.object({
  type: z.enum(["PROPERTY", "GENERAL", "VIEWING"]).default("PROPERTY"),
  propertyId: z.string().optional(),
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  contactMethod: z.enum(["email", "phone", "whatsapp"]).optional(),
  subject: z.string().max(200).optional(),
  message: z.string().min(10, "Message must be at least 10 characters").max(2000),
  turnstileToken: z.string().min(1, "Security verification required"),
  honeypot: z.string().max(0, "Bot detected").optional(), // must be empty
});

// Simple in-memory rate limit fallback (use Redis in production)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= limit) return false;

  entry.count++;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);

    // Rate limit: 5 per hour per IP
    if (!checkRateLimit(ip, 5, 60 * 60 * 1000)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const body = await request.json();

    // Validate
    const result = inquirySchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 }
      );
    }

    const { turnstileToken, honeypot, ...data } = result.data;

    // Honeypot check
    if (honeypot && honeypot.length > 0) {
      return NextResponse.json({ success: true }); // Silent reject
    }

    // Turnstile verification
    const turnstileValid = await verifyTurnstile(turnstileToken);
    if (!turnstileValid) {
      return NextResponse.json(
        { error: "Security verification failed. Please try again." },
        { status: 400 }
      );
    }

    // Check if spam (same email + same property in last hour)
    const recentSubmission = await prisma.inquiry.findFirst({
      where: {
        email: data.email.toLowerCase(),
        propertyId: data.propertyId,
        createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
      },
    });

    if (recentSubmission) {
      return NextResponse.json(
        { error: "You have already submitted an inquiry for this property recently." },
        { status: 429 }
      );
    }

    // Get property if provided
    let property = null;
    if (data.propertyId) {
      property = await prisma.property.findUnique({
        where: { id: data.propertyId },
        select: {
          id: true, title: true, slug: true,
          agent: { select: { id: true, name: true, email: true } },
        },
      });
    }

    // Get site settings for notification email
    const settings = await prisma.siteSettings.findUnique({
      where: { id: "singleton" },
      select: { notificationEmail: true, siteName: true },
    });

    // Create inquiry
    const inquiry = await prisma.inquiry.create({
      data: {
        type: data.type,
        propertyId: data.propertyId,
        name: data.name,
        email: data.email.toLowerCase(),
        phone: data.phone,
        contactMethod: data.contactMethod,
        subject: data.subject,
        message: data.message,
        assignedToId: property?.agent?.id,
        ipAddress: ip,
      },
    });

    // Send emails (fire and forget — don't block response)
    const notificationEmail = settings?.notificationEmail || process.env.ADMIN_EMAIL;
    const siteName = settings?.siteName || "HomeFind";

    if (notificationEmail) {
      sendEmail({
        to: notificationEmail,
        subject: `New ${data.type.toLowerCase()} inquiry from ${data.name}`,
        html: InquiryNotificationEmail({
          inquiry: { ...inquiry, propertyTitle: property?.title },
          siteName,
          dashboardUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/admin/inquiries/${inquiry.id}`,
        }),
      }).catch(console.error);
    }

    // Auto-reply to submitter
    sendEmail({
      to: data.email,
      subject: `We received your inquiry — ${siteName}`,
      html: InquiryConfirmationEmail({
        name: data.name,
        propertyTitle: property?.title,
        siteName,
        siteUrl: process.env.NEXT_PUBLIC_SITE_URL!,
      }),
    }).catch(console.error);

    return NextResponse.json({ success: true, id: inquiry.id });
  } catch (error) {
    console.error("[POST /api/inquiries]", error);
    return NextResponse.json({ error: "Failed to submit inquiry." }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const propertyId = searchParams.get("propertyId");
  const email = searchParams.get("email");

  if (!propertyId && !email) {
    return NextResponse.json({ error: "Missing query param" }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
