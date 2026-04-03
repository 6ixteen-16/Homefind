import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { formatDate, getInquiryStatusConfig } from "@/lib/utils";
import { InquiryDetailClient } from "@/components/admin/InquiryDetailClient";
import { ArrowLeft, Phone, Mail, MessageCircle } from "lucide-react";

export const metadata: Metadata = { title: "Inquiry Detail — Admin" };
export const dynamic = "force-dynamic";

interface PageProps { params: { id: string } }

export default async function InquiryDetailPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");

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
  }).catch(() => null);

  if (!inquiry) notFound();

  // Agents can only see their own
  if (session.user.role === "AGENT" && inquiry.assignedToId !== session.user.id) {
    redirect("/admin/inquiries");
  }

  const statusConfig = getInquiryStatusConfig(inquiry.status);

  return (
    <div className="max-w-5xl space-y-6">
      {/* Back */}
      <Link
        href="/admin/inquiries"
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft size={14} /> Back to Inquiries
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap mb-1">
            <h1 className="font-display text-display-sm font-light text-foreground">
              {inquiry.name}
            </h1>
            <span className={`text-sm px-3 py-1 rounded-full border font-medium ${statusConfig.className}`}>
              {statusConfig.label}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <a href={`mailto:${inquiry.email}`} className="flex items-center gap-1.5 hover:text-foreground transition-colors">
              <Mail size={13} /> {inquiry.email}
            </a>
            {inquiry.phone && (
              <a href={`tel:${inquiry.phone}`} className="flex items-center gap-1.5 hover:text-foreground transition-colors">
                <Phone size={13} /> {inquiry.phone}
              </a>
            )}
            {inquiry.phone && (
              <a
                href={`https://wa.me/${inquiry.phone.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-green-600 hover:text-green-700 transition-colors"
              >
                <MessageCircle size={13} /> WhatsApp
              </a>
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            Received {formatDate(inquiry.createdAt, "long")} ·{" "}
            {inquiry.type.toLowerCase()} inquiry
            {inquiry.property && (
              <>
                {" "}· Re:{" "}
                <Link
                  href={`/properties/${inquiry.property.slug}`}
                  target="_blank"
                  className="text-gold-600 hover:underline"
                >
                  {inquiry.property.title}
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Original Message */}
      <div className="bg-card rounded-xl border border-border shadow-luxury p-5">
        <h2 className="font-semibold text-foreground text-sm mb-3">Original Message</h2>
        <p className="text-foreground/80 leading-relaxed whitespace-pre-wrap">{inquiry.message}</p>
        {inquiry.contactMethod && (
          <p className="text-xs text-muted-foreground mt-3">
            Preferred contact: <strong className="capitalize">{inquiry.contactMethod}</strong>
          </p>
        )}
      </div>

      {/* Interactive section (status, notes, reply) */}
      <InquiryDetailClient
        inquiry={inquiry}
        currentUserId={session.user.id}
        userRole={session.user.role}
      />
    </div>
  );
}
