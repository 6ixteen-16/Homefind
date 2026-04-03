import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { sendEmail, baseEmailTemplate } from "@/lib/email";
import isomorphicDompurify from "isomorphic-dompurify";

interface RouteContext {
  params: { id: string };
}

const replySchema = z.object({
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(10000),
});

export async function POST(request: NextRequest, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!["SUPER_ADMIN", "ADMIN", "AGENT"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const result = replySchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: "Validation failed", details: result.error.flatten() }, { status: 400 });
  }

  const inquiry = await prisma.inquiry.findUnique({ where: { id: params.id } });
  if (!inquiry) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (session.user.role === "AGENT" && inquiry.assignedToId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const safeBody = isomorphicDompurify.sanitize(result.data.body);

  // Store reply in DB
  const reply = await prisma.inquiryReply.create({
    data: {
      inquiryId: params.id,
      sentById: session.user.id,
      subject: result.data.subject,
      body: safeBody,
    },
  });

  // Update inquiry status to IN_PROGRESS if it was NEW
  if (inquiry.status === "NEW") {
    await prisma.inquiry.update({
      where: { id: params.id },
      data: { status: "IN_PROGRESS" },
    });
  }

  // Get site settings
  const settings = await prisma.siteSettings.findUnique({
    where: { id: "singleton" },
    select: { siteName: true },
  });

  const siteName = settings?.siteName || "Prestige Properties";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";

  // Send email to the original inquirer
  const emailHtml = baseEmailTemplate(
    `<h2 style="font-size:20px;font-weight:400;color:#0A1628;margin:0 0 16px;font-family:Georgia,serif;">
      Re: ${result.data.subject}
    </h2>
    <div style="line-height:1.7;color:#444;">
      ${safeBody}
    </div>
    <hr style="border:none;border-top:1px solid #e8e2d9;margin:24px 0;" />
    <p style="font-size:12px;color:#888;">
      This email is in response to your inquiry submitted via <a href="${siteUrl}" style="color:#C9A84C;">${siteName}</a>.
      If you have further questions, please reply to this email or <a href="${siteUrl}/contact" style="color:#C9A84C;">contact us</a>.
    </p>`,
    siteName,
    siteUrl
  );

  await sendEmail({
    to: inquiry.email,
    subject: `Re: ${result.data.subject}`,
    html: emailHtml,
  });

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "INQUIRY_REPLIED",
      entityType: "Inquiry",
      entityId: params.id,
      metadata: { subject: result.data.subject } as any,
    },
  });

  return NextResponse.json({ success: true, reply });
}
