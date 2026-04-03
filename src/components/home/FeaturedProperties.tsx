import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PropertyCard } from "@/components/property/PropertyCard";
import type { PropertyCardData } from "@/types";

interface FeaturedPropertiesProps {
  properties: PropertyCardData[];
}

export function FeaturedProperties({ properties }: FeaturedPropertiesProps) {
  if (properties.length === 0) return null;

  return (
    <section className="section-padding bg-background" aria-labelledby="featured-heading">
      <div className="section-container">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
          <div>
            <span className="eyebrow block mb-3">Handpicked for You</span>
            <h2
              id="featured-heading"
              className="font-display text-display-md font-light text-foreground"
            >
              Featured Properties
            </h2>
          </div>
          <Link
            href="/properties?isFeatured=true"
            className="flex items-center gap-2 text-sm font-semibold text-gold-600 hover:text-gold-700 transition-colors group shrink-0"
          >
            View all properties
            <ArrowRight
              size={16}
              className="transition-transform duration-200 group-hover:translate-x-1"
            />
          </Link>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties.map((property, i) => (
            <PropertyCard
              key={property.id}
              property={property}
              priority={i < 3}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
