import type { Metadata } from "next";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { AgencyCard } from "@/components/agency/AgencyCard";
import { prisma } from "@/lib/prisma";
import { Building2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Property Masters — HomeFind",
  description: "Browse our directory of certified real estate agencies and property masters.",
};

export const dynamic = "force-dynamic";

export default async function AgenciesPage() {
  const agencies = await prisma.agency.findMany({
    where: { verifiedStatus: true },
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: { properties: true },
      },
    },
  });

  return (
    <>
      <Navbar />
      <main id="main-content" className="min-h-screen bg-background">
        {/* Page Header */}
        <div className="bg-navy-900 py-16 lg:py-24">
          <div className="section-container">
            <nav aria-label="Breadcrumb" className="mb-6">
              <ol className="flex items-center gap-2 text-xs text-cream-400">
                <li><a href="/" className="hover:text-gold-400 transition-colors">Home</a></li>
                <li className="text-cream-600">/</li>
                <li className="text-cream-200" aria-current="page">Agencies</li>
              </ol>
            </nav>
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
              <div className="max-w-2xl">
                <h1 className="font-display text-display-md font-light text-cream-100 mb-4 text-balance">
                  Certified <span className="text-gold-500 italic">Property Masters</span>
                </h1>
                <p className="text-cream-300 text-lg leading-relaxed">
                  Partnering with the world's most prestigious real estate agencies to bring you the highest quality listings.
                </p>
              </div>
              <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl p-6 lg:p-8 backdrop-blur-sm">
                <div className="w-12 h-12 rounded-xl bg-gold-500/20 flex items-center justify-center text-gold-400">
                  <Building2 size={24} />
                </div>
                <div>
                  <div className="text-2xl font-display text-cream-100 leading-none">{agencies.length}</div>
                  <div className="text-xs text-cream-500 uppercase tracking-widest mt-1">Partners</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Agencies Grid */}
        <div className="section-container py-16">
          {agencies.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {agencies.map((agency) => (
                <AgencyCard key={agency.id} agency={agency as any} />
              ))}
            </div>
          ) : (
            <div className="bg-muted rounded-2xl p-12 text-center">
              <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-medium text-foreground">No agencies found</h2>
              <p className="text-muted-foreground mt-2">Check back later for new partners.</p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
