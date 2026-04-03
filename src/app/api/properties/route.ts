import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildPaginationMeta } from "@/lib/utils";
import type { Prisma } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    // Parse params
    const listingType = searchParams.get("listingType") as "SALE" | "RENT" | null;
    const categories = searchParams.get("category")?.split(",").filter(Boolean) ?? [];
    const propertyTypes = searchParams.get("propertyType")?.split(",").filter(Boolean) ?? [];
    const minPrice = searchParams.get("minPrice") ? Number(searchParams.get("minPrice")) : undefined;
    const maxPrice = searchParams.get("maxPrice") ? Number(searchParams.get("maxPrice")) : undefined;
    const bedrooms = searchParams.get("bedrooms") ? parseInt(searchParams.get("bedrooms")!) : undefined;
    const bathrooms = searchParams.get("bathrooms") ? parseInt(searchParams.get("bathrooms")!) : undefined;
    const city = searchParams.get("city");
    const area = searchParams.get("area");
    const minSqft = searchParams.get("minSqft") ? Number(searchParams.get("minSqft")) : undefined;
    const maxSqft = searchParams.get("maxSqft") ? Number(searchParams.get("maxSqft")) : undefined;
    const amenityIds = searchParams.get("amenities")?.split(",").filter(Boolean) ?? [];
    const keywords = searchParams.get("keywords");
    const isFeatured = searchParams.get("isFeatured") === "true" ? true : undefined;
    const sortBy = searchParams.get("sortBy") ?? "newest";
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get("pageSize") ?? "12")));

    // Map bounds
    const swLat = searchParams.get("swLat") ? Number(searchParams.get("swLat")) : undefined;
    const swLng = searchParams.get("swLng") ? Number(searchParams.get("swLng")) : undefined;
    const neLat = searchParams.get("neLat") ? Number(searchParams.get("neLat")) : undefined;
    const neLng = searchParams.get("neLng") ? Number(searchParams.get("neLng")) : undefined;

    // Build where clause
    const where: Prisma.PropertyWhereInput = {
      status: "PUBLISHED",
      deletedAt: null,
    };

    if (listingType) where.listingType = listingType;
    if (categories.length) where.category = { in: categories as any };
    if (propertyTypes.length) where.propertyType = { in: propertyTypes };
    if (isFeatured !== undefined) where.isFeatured = isFeatured;

    // Price range
    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) where.price.gte = minPrice;
      if (maxPrice !== undefined) where.price.lte = maxPrice;
    }

    // Bedrooms
    if (bedrooms !== undefined) {
      const bedroomStr = searchParams.get("bedrooms")!;
      if (bedroomStr.endsWith("+")) {
        where.bedrooms = { gte: parseInt(bedroomStr) };
      } else {
        where.bedrooms = bedrooms;
      }
    }

    // Bathrooms
    if (bathrooms !== undefined) {
      const bathroomStr = searchParams.get("bathrooms")!;
      if (bathroomStr.endsWith("+")) {
        where.bathrooms = { gte: parseInt(bathroomStr) };
      } else {
        where.bathrooms = bathrooms;
      }
    }

    // Location
    if (city) {
      where.city = { contains: city, mode: "insensitive" };
    }
    if (area) {
      where.area = { contains: area, mode: "insensitive" };
    }

    // Square footage
    if (minSqft !== undefined || maxSqft !== undefined) {
      where.squareFootage = {};
      if (minSqft !== undefined) (where.squareFootage as any).gte = minSqft;
      if (maxSqft !== undefined) (where.squareFootage as any).lte = maxSqft;
    }

    // Amenities
    if (amenityIds.length > 0) {
      where.amenities = {
        some: {
          amenity: { name: { in: amenityIds, mode: "insensitive" } },
        },
      };
    }

    // Keywords (full text search)
    if (keywords) {
      where.OR = [
        { title: { contains: keywords, mode: "insensitive" } },
        { description: { contains: keywords, mode: "insensitive" } },
        { city: { contains: keywords, mode: "insensitive" } },
        { area: { contains: keywords, mode: "insensitive" } },
        { address: { contains: keywords, mode: "insensitive" } },
      ];
    }

    // Map bounds
    if (swLat !== undefined && swLng !== undefined && neLat !== undefined && neLng !== undefined) {
      where.latitude = { gte: swLat, lte: neLat };
      where.longitude = { gte: swLng, lte: neLng };
    }

    // Sorting
    let orderBy: Prisma.PropertyOrderByWithRelationInput = {};
    switch (sortBy) {
      case "newest":    orderBy = { createdAt: "desc" }; break;
      case "oldest":    orderBy = { createdAt: "asc" }; break;
      case "price_asc": orderBy = { price: "asc" }; break;
      case "price_desc":orderBy = { price: "desc" }; break;
      case "most_viewed":orderBy = { views: "desc" }; break;
      default:          orderBy = { createdAt: "desc" };
    }

    const [total, rawProperties] = await Promise.all([
      prisma.property.count({ where }),
      prisma.property.findMany({
        where,
        orderBy,
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
          priceNegotiable: true,
          bedrooms: true,
          bathrooms: true,
          squareFootage: true,
          city: true,
          area: true,
          country: true,
          latitude: true,
          longitude: true,
          isFeatured: true,
          views: true,
          publishedAt: true,
          createdAt: true,
          media: {
            where: { isFeatured: true, type: "IMAGE" },
            select: { url: true },
            take: 1,
          },
          agent: {
            select: { id: true, name: true, photo: true },
          },
        },
      }),
    ]);

    const properties = rawProperties.map((p) => ({
      ...p,
      featuredImage: p.media[0]?.url ?? null,
      media: undefined,
    }));

    const meta = buildPaginationMeta(total, page, pageSize);

    return NextResponse.json({ properties, meta }, {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    });
  } catch (error) {
    console.error("[GET /api/properties]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
