import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Image from "next/image";
import { formatDate } from "@/lib/utils";
import { Trash2, ImageIcon } from "lucide-react";

export const metadata: Metadata = { title: "Media Library — Admin" };
export const dynamic = "force-dynamic";

export default async function AdminMediaPage() {
  const session = await auth();
  if (!session?.user) return null;

  const media = await prisma.propertyMedia.findMany({
    where: { type: "IMAGE" },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      property: { select: { id: true, slug: true, title: true } },
    },
  }).catch(() => []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-display-sm font-light text-foreground">
          Media Library
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {media.length} image{media.length !== 1 ? "s" : ""} across all listings
        </p>
      </div>

      {media.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 bg-card rounded-xl border border-border">
          <ImageIcon size={40} className="text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground font-medium">No media uploaded yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Images uploaded to listings will appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {media.map((item) => (
            <div
              key={item.id}
              className="group relative bg-card rounded-xl overflow-hidden border border-border shadow-luxury hover:shadow-luxury-lg transition-all duration-300"
            >
              <div className="relative aspect-square">
                <Image
                  src={item.url}
                  alt={item.altText || item.property?.title || "Property image"}
                  fill
                  sizes="200px"
                  className="object-cover"
                  loading="lazy"
                />
              </div>
              <div className="p-2">
                {item.property ? (
                  <p className="text-xs text-muted-foreground truncate">
                    {item.property.title}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground italic">Unlinked</p>
                )}
                <p className="text-2xs text-muted-foreground/60 mt-0.5">
                  {formatDate(item.createdAt, "short")}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
