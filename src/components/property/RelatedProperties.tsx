import { prisma } from "@/lib/prisma";
import { PropertyCard } from "./PropertyCard";
import type { PropertyCategory } from "@prisma/client";

interface RelatedPropertiesProps {
  currentId: string;
  city: string;
  category: PropertyCategory;
}

export async function RelatedProperties({ currentId, city, category }: RelatedPropertiesProps) {
  const properties = await prisma.property.findMany({
    where: {
      id: { not: currentId },
      status: "PUBLISHED",
      deletedAt: null,
      OR: [{ city }, { category }],
    },
    take: 4,
    orderBy: { createdAt: "desc" },
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
  });

  if (properties.length === 0) return null;

  const mapped = properties.map((p) => ({
    ...p,
    featuredImage: p.media[0]?.url ?? null,
  }));

  return (
    <div>
      <h2 className="font-display text-2xl font-light text-foreground mb-6">
        Similar Properties
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {mapped.map((property) => (
          <PropertyCard key={property.id} property={property} />
        ))}
      </div>
    </div>
  );
}
