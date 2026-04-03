import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { ListingFormClient } from "@/components/admin/ListingFormClient";

export const metadata: Metadata = { title: "Edit Listing — Admin" };
export const dynamic = "force-dynamic";

interface PageProps { params: { id: string } }

export default async function AdminListingEditPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");

  const isNew = params.id === "new";

  // For existing listings, fetch the data
  const listing = isNew ? null : await prisma.property.findUnique({
    where: { id: params.id, deletedAt: null },
    include: {
      media: { orderBy: { sortOrder: "asc" } },
      amenities: { include: { amenity: true } },
    },
  }).catch(() => null);

  if (!isNew && !listing) redirect("/admin/listings");

  // Agents can only edit their own
  if (!isNew && listing && session.user.role === "AGENT" && listing.agentId !== session.user.id) {
    redirect("/admin/listings");
  }

  const [amenities, agents] = await Promise.all([
    prisma.amenity.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }).catch(() => []),
    ["SUPER_ADMIN", "ADMIN"].includes(session.user.role)
      ? prisma.user.findMany({
          where: { role: { in: ["AGENT", "ADMIN", "SUPER_ADMIN"] }, isActive: true },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        }).catch(() => [])
      : Promise.resolve([]),
  ]);

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="font-display text-display-sm font-light text-foreground">
          {isNew ? "New Listing" : "Edit Listing"}
        </h1>
        {!isNew && listing && (
          <p className="text-sm text-muted-foreground mt-1">
            ID: {listing.id.slice(-8).toUpperCase()} · Slug: {listing.slug}
          </p>
        )}
      </div>
      <ListingFormClient
        listing={listing}
        amenities={amenities}
        agents={agents}
        currentUserId={session.user.id}
        userRole={session.user.role}
      />
    </div>
  );
}
