import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: { id: string };
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const agency = await prisma.agency.findUnique({
      where: { id: params.id },
      include: {
        properties: {
          where: { status: "PUBLISHED", deletedAt: null },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            slug: true,
            title: true,
            listingType: true,
            category: true,
            propertyType: true,
            price: true,
            currency: true,
            city: true,
            area: true,
            bedrooms: true,
            bathrooms: true,
            squareFootage: true,
            isFeatured: true,
            media: {
              where: { isFeatured: true, type: "IMAGE" },
              select: { url: true },
              take: 1,
            },
          },
        },
        _count: {
          select: { users: true },
        },
      },
    });

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 });
    }

    return NextResponse.json({ agency });
  } catch (error) {
    console.error(`[GET /api/agencies/${params.id}]`, error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
