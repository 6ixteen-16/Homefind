import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { generateSlug } from "@/lib/utils";
import type { Prisma } from "@prisma/client";

const ALLOWED_ROLES = ["SUPER_ADMIN", "ADMIN", "AGENT"];

// ===== GET /api/admin/listings =====
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user || !ALLOWED_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const pageSize = Math.min(100, parseInt(searchParams.get("pageSize") ?? "25"));
  const status = searchParams.get("status");
  const search = searchParams.get("search");

  const isAgent = session.user.role === "AGENT";
  const where: Prisma.PropertyWhereInput = {
    deletedAt: null,
    ...(isAgent ? { agentId: session.user.id } : {}),
    ...(status ? { status: status as any } : {}),
    ...(search ? {
      OR: [
        { title: { contains: search, mode: "insensitive" } },
        { city: { contains: search, mode: "insensitive" } },
      ],
    } : {}),
  };

  const [total, listings] = await Promise.all([
    prisma.property.count({ where }),
    prisma.property.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        agent: { select: { id: true, name: true } },
        media: { where: { isFeatured: true }, take: 1, select: { url: true } },
      },
    }),
  ]);

  return NextResponse.json({
    listings,
    meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
  });
}

// ===== POST /api/admin/listings =====
const createListingSchema = z.object({
  title: z.string().min(3).max(200),
  listingType: z.enum(["SALE", "RENT"]),
  category: z.enum(["RESIDENTIAL", "COMMERCIAL", "LAND", "SHORT_STAY"]),
  propertyType: z.string().min(1),
  status: z.enum(["DRAFT", "PUBLISHED", "UNDER_OFFER", "SOLD", "RENTED", "ARCHIVED"]).default("DRAFT"),
  price: z.number().positive(),
  currency: z.string().default("USD"),
  priceNegotiable: z.boolean().default(false),
  priceUnit: z.string().optional(),
  bedrooms: z.number().int().min(0).optional().nullable(),
  bathrooms: z.number().int().min(0).optional().nullable(),
  parkingSpaces: z.number().int().min(0).optional().nullable(),
  squareFootage: z.number().min(0).optional().nullable(),
  landSize: z.number().min(0).optional().nullable(),
  yearBuilt: z.number().int().min(1800).max(new Date().getFullYear() + 5).optional().nullable(),
  furnishingStatus: z.string().optional().nullable(),
  floorNumber: z.number().int().optional().nullable(),
  totalFloors: z.number().int().optional().nullable(),
  description: z.string().min(10),
  address: z.string().min(3),
  city: z.string().min(1),
  area: z.string().optional().nullable(),
  country: z.string().min(1),
  zipCode: z.string().optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  isFeatured: z.boolean().default(false),
  metaTitle: z.string().optional().nullable(),
  metaDescription: z.string().optional().nullable(),
  videoUrl: z.string().url().optional().nullable(),
  agentId: z.string().optional().nullable(),
  amenityIds: z.array(z.string()).default([]),
  slug: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || !ALLOWED_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const result = createListingSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 }
      );
    }

    const { amenityIds, slug: customSlug, ...data } = result.data;

    // Agent can only assign to themselves
    const agentId = session.user.role === "AGENT"
      ? session.user.id
      : (data.agentId || session.user.id);

    // Generate unique slug
    let slug = customSlug || generateSlug(`${data.title} ${data.city}`);
    const existingSlug = await prisma.property.findUnique({ where: { slug } });
    if (existingSlug) {
      slug = `${slug}-${Date.now()}`;
    }

    const property = await prisma.property.create({
      data: {
        ...data,
        slug,
        agentId,
        publishedAt: data.status === "PUBLISHED" ? new Date() : null,
        amenities: {
          create: amenityIds.map((amenityId) => ({ amenityId })),
        },
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "LISTING_CREATED",
        entityType: "Property",
        entityId: property.id,
        newValue: { title: property.title, status: property.status } as any,
        ipAddress: request.headers.get("x-forwarded-for") || undefined,
      },
    });

    return NextResponse.json({ success: true, property }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/admin/listings]", error);
    return NextResponse.json({ error: "Failed to create listing" }, { status: 500 });
  }
}
