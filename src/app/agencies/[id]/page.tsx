import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { PropertyCard } from "@/components/property/PropertyCard";
import { prisma } from "@/lib/prisma";
import { MapPin, Mail, Building2, CheckCircle2, Phone, MessageCircle } from "lucide-react";
import Image from "next/image";

interface PageProps {
  params: { id: string };
}

async function getAgency(id: string) {
  return prisma.agency.findUnique({
    where: { id },
    include: {
      properties: {
        where: { status: "PUBLISHED", deletedAt: null },
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
          isFeatured: true,
          views: true,
          media: {
            where: { isFeatured: true, type: "IMAGE" },
            select: { url: true },
            take: 1,
          },
          agency: { select: { name: true } }
        },
      },
      _count: {
        select: { users: true },
      },
    },
  });
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const agency = await prisma.agency.findUnique({ where: { id: params.id } });
  if (!agency) return { title: "Agency Not Found" };
  return {
    title: `${agency.name} — Property Master`,
    description: `View exclusive real estate listings from ${agency.name}.`,
  };
}

export const dynamic = "force-dynamic";

export default async function AgencyDetailPage({ params }: PageProps) {
  const agency = await getAgency(params.id);
  if (!agency) notFound();

  const properties = agency.properties.map(p => ({
    ...p,
    featuredImage: p.media[0]?.url || null,
  }));

  return (
    <>
      <Navbar />
      <main id="main-content" className="min-h-screen bg-background pb-20">
        {/* Profile Header */}
        <div className="bg-navy-900 pt-32 pb-16 lg:pt-40 lg:pb-24 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 pointer-events-none">
             <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-gold-500/20 via-transparent to-transparent" />
          </div>

          <div className="section-container relative z-10">
            <div className="flex flex-col lg:flex-row gap-8 lg:items-end">
              {/* Logo */}
              <div className="w-32 h-32 lg:w-40 lg:h-40 rounded-3xl bg-white shadow-2xl flex items-center justify-center p-4 border border-white/10 shrink-0">
                {agency.logoUrl ? (
                  <Image
                    src={agency.logoUrl}
                    alt={agency.name}
                    width={160}
                    height={160}
                    className="object-contain w-full h-full"
                  />
                ) : (
                  <Building2 className="text-navy-900 w-16 h-16" />
                )}
              </div>

              {/* Agency Info */}
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  {agency.verifiedStatus && (
                    <span className="bg-gold-500 text-navy-900 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full flex items-center gap-1.5 transition-transform hover:scale-105">
                      <CheckCircle2 size={12} />
                      Verified Partner
                    </span>
                  )}
                  <span className="text-cream-400 text-xs uppercase tracking-widest font-semibold">
                    {agency._count.users} Certified Agents
                  </span>
                </div>
                <h1 className="font-display text-4xl lg:text-5xl font-light text-cream-100 mb-4">
                  {agency.name}
                </h1>
                <div className="flex flex-wrap gap-y-2 gap-x-6">
                  {agency.address && (
                    <div className="flex items-center gap-2 text-cream-300 text-sm">
                      <MapPin size={16} className="text-gold-500" />
                      {agency.address}
                    </div>
                  )}
                  {agency.contactEmail && (
                    <a href={`mailto:${agency.contactEmail}`} className="flex items-center gap-2 text-cream-300 text-sm hover:text-gold-400 transition-colors">
                      <Mail size={16} className="text-gold-500" />
                      {agency.contactEmail}
                    </a>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-row sm:flex-col lg:flex-row gap-3">
                <button className="btn-gold flex-1 sm:flex-none justify-center gap-2 px-6">
                  <Phone size={18} />
                  Call Office
                </button>
                <button className="bg-white/10 text-cream-100 hover:bg-white/20 transition-all px-6 py-3 rounded-xl border border-white/10 backdrop-blur-md flex items-center justify-center gap-2">
                  <MessageCircle size={18} />
                  WhatsApp
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Listings Section */}
        <div className="section-container mt-16">
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-border">
            <h2 className="font-display text-2xl font-light text-foreground">
              Properties by <span className="text-gold-600 italic">{agency.name}</span>
            </h2>
            <div className="text-sm text-muted-foreground italic">
              Showing {properties.length} listings
            </div>
          </div>

          {properties.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-8">
              {properties.map((property) => (
                <PropertyCard key={property.id} property={property as any} />
              ))}
            </div>
          ) : (
            <div className="bg-muted/50 rounded-2xl p-20 text-center border-2 border-dashed border-border">
              <Building2 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground">No active listings</h3>
              <p className="text-muted-foreground mt-2 max-w-sm mx-auto">
                {agency.name} doesn't have any properties published at the moment.
              </p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
