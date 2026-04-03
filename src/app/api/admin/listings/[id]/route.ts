import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import isomorphicDompurify from "isomorphic-dompurify";

interface RouteContext {
  params: { id: string };
}

function requireAdmin(role: string) {
  return ["SUPER_ADMIN", "ADMIN"].includes(role);
}

// ===== GET /api/admin/listings/[id] =====
export async function GET(_req: NextRequest, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const property = await prisma.property.findUnique({
    where: { id: params.id },
    include: {
      media: { orderBy: { sortOrder: "asc" } },
      amenities: { include: { amenity: true } },
      agent: { select: { id: true, name: true, email: true } },
    },
  });

  if (!property) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Agent can only see own listings
  if (session.user.role === "AGENT" && property.agentId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ property });
}

// ===== PATCH /api/admin/listings/[id] =====
const updateSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  listingType: z.enum(["SALE", "RENT"]).optional(),
  category: z.enum(["RESIDENTIAL", "COMMERCIAL", "LAND", "SHORT_STAY"]).optional(),
  propertyType: z.string().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "UNDER_OFFER", "SOLD", "RENTED", "ARCHIVED"]).optional(),
  price: z.number().positive().optional(),
  currency: z.string().optional(),
  priceNegotiable: z.boolean().optional(),
  bedrooms: z.number().int().min(0).optional().nullable(),
  bathrooms: z.number().int().min(0).optional().nullable(),
  parkingSpaces: z.number().int().min(0).optional().nullable(),
  squareFootage: z.number().min(0).optional().nullable(),
  landSize: z.number().min(0).optional().nullable(),
  yearBuilt: z.number().int().optional().nullable(),
  furnishingStatus: z.string().optional().nullable(),
  floorNumber: z.number().int().optional().nullable(),
  totalFloors: z.number().int().optional().nullable(),
  description: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  area: z.string().optional().nullable(),
  country: z.string().optional(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  isFeatured: z.boolean().optional(),
  metaTitle: z.string().optional().nullable(),
  metaDescription: z.string().optional().nullable(),
  ogImageUrl: z.string().optional().nullable(),
  videoUrl: z.string().optional().nullable(),
  agentId: z.string().optional().nullable(),
  amenityIds: z.array(z.string()).optional(),
  mediaOrder: z.array(z.object({ id: z.string(), sortOrder: z.number() })).optional(),
});

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.property.findUnique({ where: { id: params.id } });
  if (!existing || existing.deletedAt) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Agent can only edit own listings
  if (session.user.role === "AGENT" && existing.agentId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Agents can't publish directly
  const body = await request.json();
  if (session.user.role === "AGENT" && body.status === "PUBLISHED") {
    return NextResponse.json({ error: "Agents cannot publish listings directly" }, { status: 403 });
  }

  const result = updateSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", details: result.error.flatten() },
      { status: 400 }
    );
  }

  const { amenityIds, mediaOrder, description, ...data } = result.data;

  // Sanitize description HTML
  const safeDescription = description
    ? isomorphicDompurify.sanitize(description)
    : undefined;

  // Handle publish date
  const extra: Record<string, any> = {};
  if (data.status === "PUBLISHED" && !existing.publishedAt) {
    extra.publishedAt = new Date();
  }

  const property = await prisma.$transaction(async (tx) => {
    // Update amenities if provided
    if (amenityIds !== undefined) {
      await tx.propertyAmenity.deleteMany({ where: { propertyId: params.id } });
      if (amenityIds.length > 0) {
        await tx.propertyAmenity.createMany({
          data: amenityIds.map((amenityId) => ({ propertyId: params.id, amenityId })),
        });
      }
    }

    // Update media sort order if provided
    if (mediaOrder && mediaOrder.length > 0) {
      await Promise.all(
        mediaOrder.map((m) =>
          tx.propertyMedia.update({
            where: { id: m.id },
            data: { sortOrder: m.sortOrder },
          })
        )
      );
    }

    return tx.property.update({
      where: { id: params.id },
      data: {
        ...data,
        ...(safeDescription !== undefined ? { description: safeDescription } : {}),
        ...extra,
      },
    });
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "LISTING_UPDATED",
      entityType: "Property",
      entityId: property.id,
      prevValue: { status: existing.status } as any,
      newValue: { status: property.status, ...data } as any,
    },
  });

  return NextResponse.json({ success: true, property });
}

// ===== DELETE /api/admin/listings/[id] =====
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!requireAdmin(session.user.role)) {
    return NextResponse.json({ error: "Forbidden — Admin only" }, { status: 403 });
  }

  const existing = await prisma.property.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { permanent } = await request.json().catch(() => ({ permanent: false }));

  if (permanent && session.user.role === "SUPER_ADMIN") {
    await prisma.property.delete({ where: { id: params.id } });
  } else {
    // Soft delete
    await prisma.property.update({
      where: { id: params.id },
      data: { deletedAt: new Date(), status: "ARCHIVED" },
    });
  }

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: permanent ? "LISTING_DELETED_PERMANENT" : "LISTING_DELETED",
      entityType: "Property",
      entityId: params.id,
      prevValue: { title: existing.title } as any,
    },
  });

  return NextResponse.json({ success: true });
}
