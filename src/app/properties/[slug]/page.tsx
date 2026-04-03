import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { PropertyGallery } from "@/components/property/PropertyGallery";
import { PropertyInquiryForm } from "@/components/property/PropertyInquiryForm";
import { PropertyMap } from "@/components/property/PropertyMap";
import { RelatedProperties } from "@/components/property/RelatedProperties";
import { prisma } from "@/lib/prisma";
import { formatPrice, formatNumber, getListingTypeBadge, getStatusLabel, formatDate } from "@/lib/utils";
import { Bed, Bath, Car, Square, Calendar, MapPin, Eye, Video, Printer, Share2, Heart, CheckCircle2, Phone, Mail, MessageCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import isomorphicDompurify from "isomorphic-dompurify";

interface PageProps {
  params: { slug: string };
}

async function getProperty(slug: string) {
  return prisma.property.findUnique({
    where: { slug, deletedAt: null, status: "PUBLISHED" },
    include: {
      agent: { select: { id: true, name: true, email: true, phone: true, photo: true, bio: true } },
      media: { orderBy: { sortOrder: "asc" } },
      amenities: { include: { amenity: true } },
    },
  });
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const property = await getProperty(params.slug);
  if (!property) return { title: "Property Not Found" };

  const featuredImg = property.media.find((m) => m.isFeatured)?.url || property.media[0]?.url;
  return {
    title: property.metaTitle || property.title,
    description: property.metaDescription || `${property.propertyType} in ${property.city} — ${formatPrice(property.price, property.currency)}`,
    openGraph: {
      title: property.metaTitle || property.title,
      description: property.metaDescription || undefined,
      images: featuredImg ? [{ url: featuredImg, width: 1200, height: 630, alt: property.title }] : [],
      type: "article",
    },
  };
}

export const revalidate = 60;

export default async function PropertyDetailPage({ params }: PageProps) {
  const property = await getProperty(params.slug);
  if (!property) notFound();

  // Increment view count (fire-and-forget)
  prisma.property.update({
    where: { id: property.id },
    data: { views: { increment: 1 } },
  }).catch(() => {});

  const badge = getListingTypeBadge(property.listingType);
  const statusConfig = getStatusLabel(property.status);
  const safeDescription = isomorphicDompurify.sanitize(property.description);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: property.title,
    description: property.metaDescription || undefined,
    url: `${process.env.NEXT_PUBLIC_SITE_URL}/properties/${property.slug}`,
    image: property.media.filter((m) => m.type === "IMAGE").map((m) => m.url),
    offers: {
      "@type": "Offer",
      price: property.price,
      priceCurrency: property.currency,
      availability: "https://schema.org/InStock",
    },
    address: {
      "@type": "PostalAddress",
      streetAddress: property.address,
      addressLocality: property.city,
      addressCountry: property.country,
    },
    numberOfRooms: property.bedrooms,
    floorSize: property.squareFootage
      ? { "@type": "QuantitativeValue", value: property.squareFootage, unitCode: "FTK" }
      : undefined,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Navbar />
      <main id="main-content" className="bg-background">
        {/* Breadcrumb */}
        <div className="bg-muted/40 border-b border-border py-3">
          <div className="section-container">
            <nav aria-label="Breadcrumb">
              <ol className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                <li><Link href="/" className="hover:text-foreground transition-colors">Home</Link></li>
                <li>/</li>
                <li><Link href="/properties" className="hover:text-foreground transition-colors">Properties</Link></li>
                <li>/</li>
                <li><Link href={`/properties?category=${property.category}`} className="hover:text-foreground transition-colors capitalize">{property.category.toLowerCase()}</Link></li>
                <li>/</li>
                <li className="text-foreground font-medium truncate max-w-xs" aria-current="page">{property.title}</li>
              </ol>
            </nav>
          </div>
        </div>

        <div className="section-container py-8">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-6">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className={badge.className}>{badge.label}</span>
                <span className={`badge-status text-xs px-2.5 py-0.5 rounded-full ${statusConfig.className}`}>
                  {statusConfig.label}
                </span>
                <span className="text-xs text-muted-foreground">ID: {property.id.slice(-8).toUpperCase()}</span>
              </div>
              <h1 className="font-display text-display-md font-light text-foreground text-balance">
                {property.title}
              </h1>
              <div className="flex items-center gap-1.5 text-muted-foreground text-sm mt-2">
                <MapPin size={14} className="text-gold-500" />
                <span>{[property.area, property.city, property.country].filter(Boolean).join(", ")}</span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="font-display text-3xl lg:text-4xl font-light text-navy-900 dark:text-cream-100">
                {formatPrice(property.price, property.currency)}
              </div>
              {property.listingType === "RENT" && (
                <span className="text-sm text-muted-foreground">per month</span>
              )}
              {property.priceNegotiable && (
                <div className="text-xs text-gold-600 font-medium mt-0.5">Price negotiable</div>
              )}
            </div>
          </div>

          {/* Gallery */}
          <PropertyGallery media={property.media} title={property.title} />

          {/* Action Bar */}
          <div className="flex flex-wrap items-center gap-3 my-6 py-4 border-y border-border">
            <button
              onClick={undefined}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-red-500 transition-colors"
              aria-label="Save to favorites"
            >
              <Heart size={16} /> Save
            </button>
            <button
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Share property"
            >
              <Share2 size={16} /> Share
            </button>
            {property.videoUrl && (
              <a
                href={property.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-gold-600 hover:text-gold-700 transition-colors"
              >
                <Video size={16} /> Virtual Tour
              </a>
            )}
            <button
              onClick={() => typeof window !== "undefined" && window.print()}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors ml-auto"
              aria-label="Print property details"
            >
              <Printer size={16} /> Print
            </button>
            {property.views > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Eye size={13} />
                {formatNumber(property.views)} views
              </div>
            )}
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-8">
              {/* Key Facts */}
              <section aria-label="Property details">
                <h2 className="font-display text-2xl font-light text-foreground mb-4">Property Details</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {[
                    { icon: Bed, label: "Bedrooms", value: property.bedrooms ?? "N/A" },
                    { icon: Bath, label: "Bathrooms", value: property.bathrooms ?? "N/A" },
                    { icon: Car, label: "Parking", value: property.parkingSpaces ?? "N/A" },
                    { icon: Square, label: "Interior", value: property.squareFootage ? `${formatNumber(property.squareFootage)} sqft` : "N/A" },
                    { icon: Calendar, label: "Year Built", value: property.yearBuilt ?? "N/A" },
                    { icon: MapPin, label: "City", value: property.city },
                  ].map(({ icon: Icon, label, value }) => (
                    <div key={label} className="bg-muted/40 rounded-xl p-4 border border-border">
                      <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                        <Icon size={13} className="text-gold-500" />
                        {label}
                      </div>
                      <div className="font-medium text-foreground text-sm">{String(value)}</div>
                    </div>
                  ))}
                </div>
                {property.furnishingStatus && (
                  <div className="mt-3 inline-flex items-center gap-2 bg-gold-500/10 text-gold-700 dark:text-gold-400 text-xs px-3 py-1.5 rounded-full border border-gold-500/20">
                    <CheckCircle2 size={12} />
                    {property.furnishingStatus}
                  </div>
                )}
              </section>

              {/* Description */}
              <section aria-label="Property description">
                <h2 className="font-display text-2xl font-light text-foreground mb-4">Description</h2>
                <div
                  className="prose-luxury text-foreground/80"
                  dangerouslySetInnerHTML={{ __html: safeDescription }}
                />
              </section>

              {/* Amenities */}
              {property.amenities.length > 0 && (
                <section aria-label="Amenities">
                  <h2 className="font-display text-2xl font-light text-foreground mb-4">Amenities & Features</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {property.amenities.map(({ amenity }) => (
                      <div key={amenity.id} className="flex items-center gap-2.5 py-2">
                        <CheckCircle2 size={16} className="text-gold-500 shrink-0" />
                        <span className="text-sm text-foreground">{amenity.name}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Video Embed */}
              {property.videoUrl && (
                <section aria-label="Virtual tour">
                  <h2 className="font-display text-2xl font-light text-foreground mb-4">Virtual Tour</h2>
                  <div className="relative aspect-video rounded-xl overflow-hidden border border-border">
                    <iframe
                      src={property.videoUrl.replace("watch?v=", "embed/").replace("youtu.be/", "youtube.com/embed/")}
                      title="Property virtual tour"
                      className="absolute inset-0 w-full h-full"
                      loading="lazy"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                </section>
              )}

              {/* Map */}
              {property.latitude && property.longitude && (
                <section aria-label="Property location map">
                  <h2 className="font-display text-2xl font-light text-foreground mb-4">Location</h2>
                  <PropertyMap
                    lat={property.latitude}
                    lng={property.longitude}
                    title={property.title}
                    address={property.address}
                  />
                </section>
              )}
            </div>

            {/* Right Column — Agent + Inquiry */}
            <div className="space-y-5">
              {/* Agent Card */}
              {property.agent && (
                <div className="bg-card rounded-xl border border-border shadow-luxury p-5">
                  <h3 className="font-semibold text-sm text-foreground mb-4">Listed By</h3>
                  <div className="flex items-center gap-3 mb-4">
                    {property.agent.photo ? (
                      <Image
                        src={property.agent.photo}
                        alt={property.agent.name}
                        width={52}
                        height={52}
                        className="rounded-full object-cover border-2 border-gold-500/30"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-gold-500/20 flex items-center justify-center text-xl font-display text-gold-600">
                        {property.agent.name[0]}
                      </div>
                    )}
                    <div>
                      <div className="font-semibold text-foreground">{property.agent.name}</div>
                      <div className="text-xs text-muted-foreground">Property Agent</div>
                    </div>
                  </div>
                  {property.agent.bio && (
                    <p className="text-xs text-muted-foreground leading-relaxed mb-4">{property.agent.bio}</p>
                  )}
                  <div className="space-y-2">
                    {property.agent.phone && (
                      <a
                        href={`tel:${property.agent.phone}`}
                        className="flex items-center gap-2.5 w-full py-2.5 px-3 bg-muted rounded-lg text-sm hover:bg-muted/70 transition-colors"
                      >
                        <Phone size={14} className="text-gold-500" />
                        {property.agent.phone}
                      </a>
                    )}
                    {property.agent.email && (
                      <a
                        href={`mailto:${property.agent.email}`}
                        className="flex items-center gap-2.5 w-full py-2.5 px-3 bg-muted rounded-lg text-sm hover:bg-muted/70 transition-colors"
                      >
                        <Mail size={14} className="text-gold-500" />
                        {property.agent.email}
                      </a>
                    )}
                    <a
                      href={`https://wa.me/${property.agent.phone?.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2.5 w-full py-2.5 px-3 bg-green-500/10 text-green-700 dark:text-green-400 rounded-lg text-sm hover:bg-green-500/20 transition-colors border border-green-500/20"
                    >
                      <MessageCircle size={14} />
                      WhatsApp
                    </a>
                  </div>
                </div>
              )}

              {/* Inquiry Form */}
              <div className="bg-card rounded-xl border border-border shadow-luxury p-5">
                <h3 className="font-semibold text-foreground mb-1">Inquire About This Property</h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Reference: {property.id.slice(-8).toUpperCase()}
                </p>
                <PropertyInquiryForm propertyId={property.id} propertyTitle={property.title} />
              </div>

              {/* Listed Date */}
              {property.publishedAt && (
                <p className="text-xs text-center text-muted-foreground">
                  Listed {formatDate(property.publishedAt, "long")}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Related Properties */}
        <div className="bg-muted/30 border-t border-border py-16">
          <div className="section-container">
            <RelatedProperties
              currentId={property.id}
              city={property.city}
              category={property.category}
            />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
