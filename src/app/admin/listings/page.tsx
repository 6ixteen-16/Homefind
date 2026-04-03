import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminListingsClient } from "@/components/admin/AdminListingsClient";
import Link from "next/link";
import { Plus } from "lucide-react";
import type { Prisma } from "@prisma/client";

export const metadata: Metadata = { title: "Listings — Admin" };
export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: {
    status?: string;
    listingType?: string;
    page?: string;
    search?: string;
    agentId?: string;
  };
}

export default async function AdminListingsPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user) return null;

  const isAgent = session.user.role === "AGENT";
  const page = Math.max(1, parseInt(searchParams.page ?? "1"));
  const pageSize = 25;

  const where: Prisma.PropertyWhereInput = {
    deletedAt: null,
    ...(isAgent ? { agentId: session.user.id } : {}),
    ...(searchParams.status ? { status: searchParams.status as any } : {}),
    ...(searchParams.listingType ? { listingType: searchParams.listingType as any } : {}),
    ...(searchParams.agentId ? { agentId: searchParams.agentId } : {}),
    ...(searchParams.search
      ? {
          OR: [
            { title: { contains: searchParams.search, mode: "insensitive" } },
            { city: { contains: searchParams.search, mode: "insensitive" } },
            { address: { contains: searchParams.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [total, listings, agents] = await Promise.all([
    prisma.property.count({ where }),
    prisma.property.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        slug: true,
        title: true,
        listingType: true,
        category: true,
        propertyType: true,
        status: true,
        price: true,
        currency: true,
        city: true,
        isFeatured: true,
        views: true,
        createdAt: true,
        updatedAt: true,
        agent: { select: { id: true, name: true } },
        media: {
          where: { isFeatured: true, type: "IMAGE" },
          take: 1,
          select: { url: true },
        },
      },
    }),
    !isAgent
      ? prisma.user.findMany({
          where: { role: { in: ["AGENT", "ADMIN", "SUPER_ADMIN"] }, isActive: true },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
  ]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-display-sm font-light text-foreground">Listings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {total.toLocaleString()} {total === 1 ? "property" : "properties"} total
          </p>
        </div>
        {!isAgent || session.user.role !== "VIEWER" ? (
          <Link href="/admin/listings/new" className="btn-gold">
            <Plus size={16} />
            New Listing
          </Link>
        ) : null}
      </div>

      <AdminListingsClient
        listings={listings.map((l) => ({
          ...l,
          featuredImage: l.media[0]?.url ?? null,
        }))}
        agents={agents}
        meta={{ total, page, pageSize, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1 }}
        searchParams={searchParams}
        currentUserId={session.user.id}
        userRole={session.user.role}
      />
    </div>
  );
}
