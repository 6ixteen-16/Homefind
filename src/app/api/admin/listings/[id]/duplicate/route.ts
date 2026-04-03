import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateSlug } from "@/lib/utils";

interface RouteContext {
  params: { id: string };
}

export async function POST(_req: NextRequest, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["SUPER_ADMIN", "ADMIN", "AGENT"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const source = await prisma.property.findUnique({
    where: { id: params.id, deletedAt: null },
    include: { amenities: true, media: true },
  });

  if (!source) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (session.user.role === "AGENT" && source.agentId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const baseSlug = generateSlug(`${source.title} copy ${Date.now()}`);
  const slug = await (async () => {
    let s = baseSlug;
    while (await prisma.property.findUnique({ where: { slug: s } })) {
      s = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
    }
    return s;
  })();

  const { id, createdAt, updatedAt, publishedAt, views, slug: _slug, ...data } = source;

  const property = await prisma.property.create({
    data: {
      ...data,
      slug,
      title: `${source.title} (Copy)`,
      status: "DRAFT",
      isFeatured: false,
      publishedAt: null,
      views: 0,
      agentId: session.user.role === "AGENT" ? session.user.id : source.agentId,
      amenities: {
        create: source.amenities.map((a) => ({ amenityId: a.amenityId })),
      },
      media: {
        create: source.media.map(({ id: _mid, propertyId: _pid, createdAt: _cat, ...m }) => m),
      },
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "LISTING_DUPLICATED",
      entityType: "Property",
      entityId: property.id,
      metadata: { sourceId: source.id } as any,
    },
  });

  return NextResponse.json({ success: true, property }, { status: 201 });
}
