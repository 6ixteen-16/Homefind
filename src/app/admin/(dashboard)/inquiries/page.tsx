import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminInquiriesClient } from "@/components/admin/AdminInquiriesClient";
import type { Prisma } from "@prisma/client";

export const metadata: Metadata = { title: "Inquiries — Admin" };
export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: {
    status?: string;
    page?: string;
    search?: string;
    assignedToId?: string;
    type?: string;
  };
}

export default async function AdminInquiriesPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user) return null;

  const isAgent = session.user.role === "AGENT";
  const page = Math.max(1, parseInt(searchParams.page ?? "1"));
  const pageSize = 20;

  const where: Prisma.InquiryWhereInput = {
    isSpam: false,
    ...(isAgent ? { assignedToId: session.user.id } : {}),
    ...(searchParams.status ? { status: searchParams.status as any } : {}),
    ...(searchParams.type ? { type: searchParams.type as any } : {}),
    ...(searchParams.assignedToId ? { assignedToId: searchParams.assignedToId } : {}),
    ...(searchParams.search ? {
      OR: [
        { name: { contains: searchParams.search, mode: "insensitive" } },
        { email: { contains: searchParams.search, mode: "insensitive" } },
        { message: { contains: searchParams.search, mode: "insensitive" } },
      ],
    } : {}),
  };

  const [total, statusCounts, inquiries] = await Promise.all([
    prisma.inquiry.count({ where }),
    // Status counts for badges
    prisma.inquiry.groupBy({
      by: ["status"],
      where: { isSpam: false, ...(isAgent ? { assignedToId: session.user.id } : {}) },
      _count: true,
    }),
    prisma.inquiry.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        property: { select: { id: true, slug: true, title: true } },
        assignedTo: { select: { id: true, name: true } },
        _count: { select: { notes: true, replies: true } },
      },
    }),
  ]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-display-sm font-light text-foreground">Inquiries</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {total} {total === 1 ? "inquiry" : "inquiries"} total
        </p>
      </div>

      <AdminInquiriesClient
        inquiries={inquiries}
        statusCounts={Object.fromEntries(statusCounts.map((s) => [s.status, s._count]))}
        meta={{ total, page, pageSize, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1 }}
        searchParams={searchParams}
        userRole={session.user.role}
        currentUserId={session.user.id}
      />
    </div>
  );
}
