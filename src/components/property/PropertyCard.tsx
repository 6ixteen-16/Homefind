"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, Bed, Bath, Square, MapPin, Eye } from "lucide-react";
import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { cn, formatPrice, formatNumber, getListingTypeBadge, getStatusLabel } from "@/lib/utils";
import type { PropertyCardData } from "@/types";

interface PropertyCardProps {
  property: PropertyCardData;
  view?: "grid" | "list";
  priority?: boolean;
}

function useFavorites() {
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const stored = localStorage.getItem("property-favorites");
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  const toggle = useCallback((id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      try {
        localStorage.setItem("property-favorites", JSON.stringify([...next]));
      } catch {}
      return next;
    });
  }, []);

  return { favorites, toggle };
}

export function PropertyCard({
  property,
  view = "grid",
  priority = false,
}: PropertyCardProps) {
  const { favorites, toggle } = useFavorites();
  const isFavorite = favorites.has(property.id);
  const badge = getListingTypeBadge(property.listingType);
  const statusConfig = getStatusLabel(property.status);

  const imageUrl =
    property.featuredImage ||
    `https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80`;

  if (view === "list") {
    return (
      <motion.article
        layout
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="property-card flex flex-col sm:flex-row overflow-hidden"
      >
        {/* Thumbnail */}
        <Link
          href={`/properties/${property.slug}`}
          className="relative sm:w-72 h-48 sm:h-auto shrink-0 overflow-hidden"
        >
          <Image
            src={imageUrl}
            alt={property.title}
            fill
            sizes="(max-width: 640px) 100vw, 288px"
            className="object-cover transition-transform duration-500 hover:scale-105"
            loading={priority ? "eager" : "lazy"}
          />
          <div className="absolute top-3 left-3">
            <span className={badge.className}>{badge.label}</span>
          </div>
        </Link>

        {/* Details */}
        <div className="flex flex-col flex-1 p-5">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="eyebrow text-2xs">{property.propertyType}</span>
                <span className={cn("badge-status text-2xs px-2 py-0.5 rounded-full", statusConfig.className)}>
                  {statusConfig.label}
                </span>
              </div>
              <Link href={`/properties/${property.slug}`}>
                <h3 className="font-display text-xl font-light text-foreground hover:text-gold-600 transition-colors line-clamp-1">
                  {property.title}
                </h3>
              </Link>
              <div className="flex items-center gap-1.5 text-muted-foreground text-xs mt-1">
                <MapPin size={11} />
                <span>
                  {property.area ? `${property.area}, ` : ""}{property.city}
                </span>
              </div>
            </div>

            <button
              onClick={() => toggle(property.id)}
              aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
              className={cn(
                "p-2 rounded-full transition-all duration-200 shrink-0",
                isFavorite
                  ? "bg-red-50 text-red-500"
                  : "bg-muted text-muted-foreground hover:text-red-500 hover:bg-red-50"
              )}
            >
              <Heart
                size={16}
                className={cn("transition-all", isFavorite && "fill-current")}
              />
            </button>
          </div>

          {/* Price */}
          <div className="mb-4">
            <span className="font-display text-2xl font-light text-navy-900 dark:text-cream-100">
              {formatPrice(property.price, property.currency)}
            </span>
            {property.listingType === "RENT" && (
              <span className="text-muted-foreground text-sm ml-1">/mo</span>
            )}
            {property.priceNegotiable && (
              <span className="ml-2 text-xs text-gold-600 font-medium">Negotiable</span>
            )}
          </div>

          {/* Features */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-auto pt-4 border-t border-border">
            {property.bedrooms != null && (
              <div className="flex items-center gap-1.5">
                <Bed size={14} className="text-gold-500" />
                <span>{property.bedrooms} Beds</span>
              </div>
            )}
            {property.bathrooms != null && (
              <div className="flex items-center gap-1.5">
                <Bath size={14} className="text-gold-500" />
                <span>{property.bathrooms} Baths</span>
              </div>
            )}
            {property.squareFootage && (
              <div className="flex items-center gap-1.5">
                <Square size={14} className="text-gold-500" />
                <span>{formatNumber(property.squareFootage)} sqft</span>
              </div>
            )}
            {property.views > 0 && (
              <div className="flex items-center gap-1.5 ml-auto">
                <Eye size={13} className="text-muted-foreground/60" />
                <span className="text-xs text-muted-foreground/60">{formatNumber(property.views)}</span>
              </div>
            )}
          </div>
        </div>
      </motion.article>
    );
  }

  // Grid view (default)
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="property-card group"
    >
      {/* Image */}
      <div className="relative h-52 overflow-hidden">
        <Link href={`/properties/${property.slug}`} tabIndex={-1} aria-hidden="true">
          <Image
            src={imageUrl}
            alt={property.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-700 group-hover:scale-108"
            loading={priority ? "eager" : "lazy"}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </Link>

        {/* Badges */}
        <div className="absolute top-3 left-3 flex items-center gap-2">
          <span className={badge.className}>{badge.label}</span>
          {property.isFeatured && (
            <span className="bg-gold-500 text-navy-900 text-xs font-semibold px-2 py-0.5 rounded-full">
              Featured
            </span>
          )}
        </div>

        {/* Favorite Button */}
        <button
          onClick={() => toggle(property.id)}
          aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
          className={cn(
            "absolute top-3 right-3 p-2 rounded-full backdrop-blur-sm transition-all duration-200",
            isFavorite
              ? "bg-red-50 text-red-500"
              : "bg-white/20 text-white hover:bg-white/40"
          )}
        >
          <Heart
            size={16}
            className={cn("transition-all", isFavorite && "fill-current text-red-500")}
          />
        </button>

        {/* View count */}
        {property.views > 0 && (
          <div className="absolute bottom-3 right-3 flex items-center gap-1 glass rounded-full px-2 py-0.5">
            <Eye size={11} className="text-cream-200" />
            <span className="text-2xs text-cream-200">{formatNumber(property.views)}</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Category & Type */}
        <div className="flex items-center gap-2 mb-2">
          <span className="eyebrow text-2xs">{property.propertyType}</span>
        </div>

        {/* Title */}
        <Link href={`/properties/${property.slug}`}>
          <h3 className="font-display text-lg font-light text-foreground hover:text-gold-600 transition-colors line-clamp-1 leading-snug mb-1">
            {property.title}
          </h3>
        </Link>

        {/* Location */}
        <div className="flex items-center gap-1 text-muted-foreground text-xs mb-3">
          <MapPin size={11} className="shrink-0" />
          <span className="truncate">
            {property.area ? `${property.area}, ` : ""}
            {property.city}
          </span>
        </div>

        {/* Price */}
        <div className="mb-3">
          <span className="font-display text-xl font-light text-navy-900 dark:text-cream-100">
            {formatPrice(property.price, property.currency)}
          </span>
          {property.listingType === "RENT" && (
            <span className="text-muted-foreground text-sm ml-1">/mo</span>
          )}
          {property.priceNegotiable && (
            <span className="ml-2 text-xs text-gold-600 font-medium">Negotiable</span>
          )}
        </div>

        {/* Divider */}
        <div className="h-px bg-border mb-3" />

        {/* Features */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {property.bedrooms != null && (
            <div className="flex items-center gap-1">
              <Bed size={13} className="text-gold-500" />
              <span>{property.bedrooms}</span>
            </div>
          )}
          {property.bathrooms != null && (
            <div className="flex items-center gap-1">
              <Bath size={13} className="text-gold-500" />
              <span>{property.bathrooms}</span>
            </div>
          )}
          {property.squareFootage && (
            <div className="flex items-center gap-1">
              <Square size={13} className="text-gold-500" />
              <span>{formatNumber(property.squareFootage)} sqft</span>
            </div>
          )}

          {/* Agent */}
          {property.agent && (
            <div className="ml-auto flex items-center gap-1.5">
              {property.agent.photo ? (
                <Image
                  src={property.agent.photo}
                  alt={property.agent.name}
                  width={20}
                  height={20}
                  className="rounded-full object-cover"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-gold-500/20 flex items-center justify-center text-2xs text-gold-600 font-semibold">
                  {property.agent.name[0]}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.article>
  );
}

// Skeleton loader
export function PropertyCardSkeleton({ view = "grid" }: { view?: "grid" | "list" }) {
  if (view === "list") {
    return (
      <div className="property-card flex flex-col sm:flex-row overflow-hidden">
        <div className="skeleton sm:w-72 h-48" />
        <div className="flex-1 p-5 space-y-3">
          <div className="skeleton h-4 w-1/3" />
          <div className="skeleton h-6 w-3/4" />
          <div className="skeleton h-4 w-1/2" />
          <div className="skeleton h-8 w-1/3" />
          <div className="skeleton h-4 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="property-card">
      <div className="skeleton h-52" />
      <div className="p-4 space-y-3">
        <div className="skeleton h-3 w-1/4" />
        <div className="skeleton h-5 w-3/4" />
        <div className="skeleton h-3 w-1/2" />
        <div className="skeleton h-6 w-1/3" />
        <div className="h-px bg-border" />
        <div className="skeleton h-3 w-2/3" />
      </div>
    </div>
  );
}
