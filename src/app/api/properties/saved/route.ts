import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const ids = searchParams.getAll("ids");

  if (!ids.length) {
    return NextResponse.json({ properties: [] });
  }

  // Limit to 50 IDs max
  const safeIds = ids.slice(0, 50);

  const properties = await prisma.property.findMany({
    where: {
      id: { in: safeIds },
      status: "PUBLISHED",
      deletedAt: null,
    },
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
        take: 1,
        select: { url: true },
      },
      agent: { select: { id: true, name: true, photo: true } },
    },
  }).catch(() => []);

  const mapped = properties.map((p) => ({
    ...p,
    featuredImage: p.media[0]?.url ?? null,
  }));

  return NextResponse.json({ properties: mapped });
}
