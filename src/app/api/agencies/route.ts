import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const agencies = await prisma.agency.findMany({
      where: { verifiedStatus: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        logoUrl: true,
        address: true,
        _count: {
          select: { properties: { where: { status: "PUBLISHED", deletedAt: null } } },
        },
      },
    });

    return NextResponse.json({ agencies });
  } catch (error) {
    console.error("[GET /api/agencies]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
