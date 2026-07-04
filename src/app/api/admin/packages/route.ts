import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isGlobalAdmin = session.user.role === "SUPER_ADMIN" || session.user.role === "ADMIN";

  if (!isGlobalAdmin) {
    return NextResponse.json({ error: "Forbidden — Access restricted to Administrators" }, { status: 403 });
  }

  const packages = await prisma.listingPackage.findMany({
    orderBy: { price: "asc" },
  }).catch(() => []);

  return NextResponse.json({ packages });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { name, description, price, currency, listingLimit, durationDays, isPopular, isActive } = body;

    const newPackage = await prisma.listingPackage.create({
      data: {
        name,
        description,
        price: Number(price),
        currency: currency || "USD",
        listingLimit: Number(listingLimit),
        durationDays: Number(durationDays),
        isPopular: Boolean(isPopular),
        isActive: Boolean(isActive),
      },
    });

    return NextResponse.json(newPackage, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
