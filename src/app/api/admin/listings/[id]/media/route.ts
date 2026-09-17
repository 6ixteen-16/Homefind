import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface RouteContext {
  params: { id: string };
}

const ALLOWED_ROLES = ["SUPER_ADMIN", "ADMIN", "AGENCY_ADMIN", "AGENT"];

// POST /api/admin/listings/[id]/media — add a media URL to a listing
export async function POST(request: NextRequest, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user || !ALLOWED_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const property = await prisma.property.findUnique({ where: { id: params.id, deletedAt: null } });
  if (!property) return NextResponse.json({ error: "Property not found" }, { status: 404 });

  // Agents can only manage their own listings
  if (session.user.role === "AGENT" && property.agentId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { url, type = "IMAGE", altText = null, isFeatured = false } = body;

  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "Image URL is required" }, { status: 400 });
  }

  // Get current max sort order
  const maxSort = await prisma.propertyMedia.aggregate({
    _max: { sortOrder: true },
    where: { propertyId: params.id },
  });
  const sortOrder = (maxSort._max.sortOrder ?? -1) + 1;

  // If this is the first image or isFeatured requested, set it as featured
  const existingCount = await prisma.propertyMedia.count({ where: { propertyId: params.id } });
  const shouldBeFeatured = isFeatured || existingCount === 0;

  // Un-feature others if this becomes featured
  if (shouldBeFeatured) {
    await prisma.propertyMedia.updateMany({
      where: { propertyId: params.id, isFeatured: true },
      data: { isFeatured: false },
    });
  }

  const media = await prisma.propertyMedia.create({
    data: {
      propertyId: params.id,
      url,
      publicId: `manual-${Date.now()}`,
      type,
      altText,
      isFeatured: shouldBeFeatured,
      sortOrder,
    },
  });

  return NextResponse.json({ success: true, media }, { status: 201 });
}

// DELETE /api/admin/listings/[id]/media — remove a media item
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user || !ALLOWED_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const property = await prisma.property.findUnique({ where: { id: params.id, deletedAt: null } });
  if (!property) return NextResponse.json({ error: "Property not found" }, { status: 404 });

  if (session.user.role === "AGENT" && property.agentId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { mediaId } = await request.json();
  if (!mediaId) return NextResponse.json({ error: "mediaId required" }, { status: 400 });

  const deleted = await prisma.propertyMedia.deleteMany({
    where: { id: mediaId, propertyId: params.id },
  });

  if (deleted.count === 0) return NextResponse.json({ error: "Media not found" }, { status: 404 });

  // If deleted was featured, make the first remaining one featured
  const wasIsFeatured = await prisma.propertyMedia.findFirst({ where: { propertyId: params.id, isFeatured: true } });
  if (!wasIsFeatured) {
    const first = await prisma.propertyMedia.findFirst({ where: { propertyId: params.id }, orderBy: { sortOrder: "asc" } });
    if (first) await prisma.propertyMedia.update({ where: { id: first.id }, data: { isFeatured: true } });
  }

  return NextResponse.json({ success: true });
}

// PATCH /api/admin/listings/[id]/media — set featured image
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user || !ALLOWED_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const property = await prisma.property.findUnique({ where: { id: params.id, deletedAt: null } });
  if (!property) return NextResponse.json({ error: "Property not found" }, { status: 404 });

  if (session.user.role === "AGENT" && property.agentId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { mediaId } = await request.json();
  if (!mediaId) return NextResponse.json({ error: "mediaId required" }, { status: 400 });

  await prisma.propertyMedia.updateMany({
    where: { propertyId: params.id },
    data: { isFeatured: false },
  });
  await prisma.propertyMedia.update({ where: { id: mediaId }, data: { isFeatured: true } });

  return NextResponse.json({ success: true });
}
