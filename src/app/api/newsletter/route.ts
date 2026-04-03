import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { NewsletterWelcomeEmail } from "@/emails/InquiryNotificationEmail";

const schema = z.object({
  email: z.string().email("Invalid email address"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
    }

    const { email } = result.data;

    const existing = await prisma.subscriber.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      return NextResponse.json({ success: true }); // Already subscribed — silent success
    }

    await prisma.subscriber.create({
      data: { email: email.toLowerCase(), isConfirmed: true },
    });

    const settings = await prisma.siteSettings.findUnique({
      where: { id: "singleton" },
      select: { siteName: true },
    });

    sendEmail({
      to: email,
      subject: `Welcome to ${settings?.siteName || "Prestige Properties"}!`,
      html: NewsletterWelcomeEmail({
        siteName: settings?.siteName || "Prestige Properties",
        siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "",
      }),
    }).catch(console.error);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[POST /api/newsletter]", error);
    return NextResponse.json({ error: "Subscription failed." }, { status: 500 });
  }
}
