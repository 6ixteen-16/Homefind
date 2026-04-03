import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const q = searchParams.get("q") || "";

  if (q.length < 2) {
    return NextResponse.json({ locations: [] });
  }

  // Get distinct cities and areas matching the query
  const [cities, areas] = await Promise.all([
    prisma.property.findMany({
      where: {
        status: "PUBLISHED",
        deletedAt: null,
        city: { contains: q, mode: "insensitive" },
      },
      select: { city: true },
      distinct: ["city"],
      take: 5,
    }),
    prisma.property.findMany({
      where: {
        status: "PUBLISHED",
        deletedAt: null,
        area: { contains: q, mode: "insensitive" },
      },
      select: { area: true, city: true },
      distinct: ["area"],
      take: 5,
    }),
  ]).catch(() => [[], []]);

  const locations = [
    ...cities.map((p) => ({ label: p.city, value: p.city, type: "city" })),
    ...areas
      .filter((p) => p.area)
      .map((p) => ({
        label: `${p.area}, ${p.city}`,
        value: p.area as string,
        type: "area",
      })),
  ];

  return NextResponse.json({ locations }, {
    headers: { "Cache-Control": "public, s-maxage=60" },
  });
}
