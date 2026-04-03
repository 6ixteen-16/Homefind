"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { PropertyCard } from "@/components/property/PropertyCard";
import { Heart, ArrowRight } from "lucide-react";
import type { PropertyCardData } from "@/types";

export default function SavedPage() {
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [properties, setProperties] = useState<PropertyCardData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("property-favorites");
      const ids: string[] = stored ? JSON.parse(stored) : [];
      setSavedIds(ids);

      if (ids.length === 0) {
        setLoading(false);
        return;
      }

      // Fetch saved properties from API
      const params = new URLSearchParams();
      ids.forEach((id) => params.append("ids", id));

      fetch(`/api/properties/saved?${params.toString()}`)
        .then((r) => r.json())
        .then((d) => setProperties(d.properties || []))
        .catch(() => {})
        .finally(() => setLoading(false));
    } catch {
      setLoading(false);
    }
  }, []);

  const clearAll = () => {
    localStorage.removeItem("property-favorites");
    setSavedIds([]);
    setProperties([]);
  };

  return (
    <>
      <Navbar />
      <main id="main-content">
        {/* Header */}
        <section className="bg-navy-900 py-16">
          <div className="section-container">
            <nav aria-label="Breadcrumb" className="mb-6">
              <ol className="flex items-center gap-2 text-xs text-cream-500">
                <li><Link href="/" className="hover:text-gold-400 transition-colors">Home</Link></li>
                <li>/</li>
                <li className="text-cream-200" aria-current="page">Saved Properties</li>
              </ol>
            </nav>
            <div className="flex items-center justify-between">
              <div>
                <span className="eyebrow block mb-2 text-gold-400">Your Wishlist</span>
                <h1 className="font-display text-display-md font-light text-cream-100">
                  Saved Properties
                </h1>
              </div>
              {savedIds.length > 0 && (
                <button
                  onClick={clearAll}
                  className="text-sm text-cream-400 hover:text-red-400 transition-colors"
                >
                  Clear all
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Content */}
        <section className="section-padding bg-background">
          <div className="section-container">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="property-card">
                    <div className="skeleton h-52" />
                    <div className="p-4 space-y-3">
                      <div className="skeleton h-4 w-1/4" />
                      <div className="skeleton h-5 w-3/4" />
                      <div className="skeleton h-6 w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : savedIds.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
                  <Heart size={32} className="text-muted-foreground/50" />
                </div>
                <h2 className="font-display text-2xl font-light text-foreground mb-2">
                  No saved properties yet
                </h2>
                <p className="text-muted-foreground max-w-sm mb-8">
                  Tap the heart icon on any listing to save it here for easy access later.
                </p>
                <Link href="/properties" className="btn-gold">
                  Browse Properties <ArrowRight size={16} />
                </Link>
              </div>
            ) : properties.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-muted-foreground mb-4">
                  {savedIds.length} saved listing{savedIds.length !== 1 ? "s" : ""}, but they may no longer be available.
                </p>
                <div className="flex gap-3 justify-center">
                  <button onClick={clearAll} className="btn-navy">Clear saved list</button>
                  <Link href="/properties" className="btn-gold">Browse all</Link>
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-6">
                  {properties.length} saved propert{properties.length !== 1 ? "ies" : "y"}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {properties.map((property) => (
                    <PropertyCard key={property.id} property={property} />
                  ))}
                </div>
              </>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
