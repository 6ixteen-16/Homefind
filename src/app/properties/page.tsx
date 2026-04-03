import type { Metadata } from "next";
import { Suspense } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { PropertiesPageClient } from "@/components/property/PropertiesPageClient";
import { PropertyFiltersPanel } from "@/components/property/PropertyFiltersPanel";

export const metadata: Metadata = {
  title: "Browse Properties",
  description:
    "Search and filter through our extensive collection of residential and commercial properties for sale and rent.",
};

// SSR for filter-based queries to be indexable
export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: {
    listingType?: string;
    category?: string;
    propertyType?: string;
    minPrice?: string;
    maxPrice?: string;
    bedrooms?: string;
    bathrooms?: string;
    minSqft?: string;
    maxSqft?: string;
    city?: string;
    area?: string;
    amenities?: string;
    keywords?: string;
    sortBy?: string;
    page?: string;
    view?: string;
  };
}

export default function PropertiesPage({ searchParams }: PageProps) {
  return (
    <>
      <Navbar />
      <main id="main-content" className="min-h-screen bg-background">
        {/* Page Header */}
        <div className="bg-navy-900 py-12">
          <div className="section-container">
            <nav aria-label="Breadcrumb" className="mb-4">
              <ol className="flex items-center gap-2 text-xs text-cream-400">
                <li><a href="/" className="hover:text-gold-400 transition-colors">Home</a></li>
                <li className="text-cream-600">/</li>
                <li className="text-cream-200" aria-current="page">Properties</li>
              </ol>
            </nav>
            <h1 className="font-display text-3xl font-light text-cream-100">
              Browse Properties
            </h1>
          </div>
        </div>

        {/* Filters + Results */}
        <div className="section-container py-8">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Filters Sidebar */}
            <aside className="lg:w-72 shrink-0" aria-label="Property filters">
              <PropertyFiltersPanel searchParams={searchParams} />
            </aside>

            {/* Results */}
            <div className="flex-1 min-w-0">
              <Suspense fallback={<PropertiesLoadingSkeleton />}>
                <PropertiesPageClient searchParams={searchParams} />
              </Suspense>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

function PropertiesLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="skeleton h-5 w-40" />
        <div className="skeleton h-9 w-32" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="property-card">
            <div className="skeleton h-52" />
            <div className="p-4 space-y-3">
              <div className="skeleton h-3 w-1/4" />
              <div className="skeleton h-5 w-3/4" />
              <div className="skeleton h-3 w-1/2" />
              <div className="skeleton h-6 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
