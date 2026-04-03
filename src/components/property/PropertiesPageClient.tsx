"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { LayoutGrid, List, SlidersHorizontal, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { PropertyCard, PropertyCardSkeleton } from "./PropertyCard";
import { PropertyFiltersPanel } from "./PropertyFiltersPanel";
import { cn, buildQueryString } from "@/lib/utils";
import type { PropertyCardData, PaginationMeta } from "@/types";

type SortOption = "newest" | "oldest" | "price_asc" | "price_desc" | "most_viewed";

interface PropertiesPageClientProps {
  searchParams: Record<string, string | undefined>;
}

export function PropertiesPageClient({ searchParams }: PropertiesPageClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const urlParams = useSearchParams();

  const [properties, setProperties] = useState<PropertyCardData[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"grid" | "list">(
    (searchParams.view as "grid" | "list") ?? "grid"
  );
  const [sortBy, setSortBy] = useState<SortOption>(
    (searchParams.sortBy as SortOption) ?? "newest"
  );
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const fetchProperties = useCallback(async (params: URLSearchParams) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setLoading(true);
    try {
      const res = await fetch(`/api/properties?${params.toString()}`, {
        signal: abortRef.current.signal,
      });
      if (!res.ok) throw new Error("Fetch failed");
      const data = await res.json();
      setProperties(data.properties);
      setMeta(data.meta);
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setProperties([]);
        setMeta(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(urlParams.toString());
    if (!params.has("sortBy")) params.set("sortBy", sortBy);
    fetchProperties(params);
  }, [urlParams, sortBy, fetchProperties]);

  // Save view preference
  useEffect(() => {
    localStorage.setItem("property-view", view);
  }, [view]);

  // Load view preference on mount
  useEffect(() => {
    const saved = localStorage.getItem("property-view");
    if (saved === "grid" || saved === "list") setView(saved);
  }, []);

  const updateSort = (newSort: SortOption) => {
    setSortBy(newSort);
    const params = new URLSearchParams(urlParams.toString());
    params.set("sortBy", newSort);
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(urlParams.toString());
    params.set("page", String(page));
    router.push(`${pathname}?${params.toString()}`, { scroll: true });
  };

  // Active filter count
  const activeFilterCount = ["listingType", "category", "propertyType", "minPrice",
    "maxPrice", "bedrooms", "bathrooms", "city", "area", "amenities", "keywords"]
    .filter((k) => urlParams.has(k)).length;

  const clearFilter = (key: string) => {
    const params = new URLSearchParams(urlParams.toString());
    params.delete(key);
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          {/* Mobile filter trigger */}
          <button
            onClick={() => setMobileFiltersOpen(true)}
            className="lg:hidden flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors"
          >
            <SlidersHorizontal size={16} />
            Filters
            {activeFilterCount > 0 && (
              <span className="bg-gold-500 text-navy-900 text-xs font-bold rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Results count */}
          {meta && !loading && (
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{meta.total.toLocaleString()}</span>{" "}
              {meta.total === 1 ? "property" : "properties"} found
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => updateSort(e.target.value as SortOption)}
            aria-label="Sort properties"
            className="text-sm bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-gold-500 transition-colors"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="price_asc">Price: Low → High</option>
            <option value="price_desc">Price: High → Low</option>
            <option value="most_viewed">Most Viewed</option>
          </select>

          {/* View Toggle */}
          <div className="flex items-center rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => setView("grid")}
              aria-label="Grid view"
              aria-pressed={view === "grid"}
              className={cn(
                "p-2.5 transition-colors",
                view === "grid" ? "bg-navy-900 text-cream-100" : "hover:bg-muted text-muted-foreground"
              )}
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setView("list")}
              aria-label="List view"
              aria-pressed={view === "list"}
              className={cn(
                "p-2.5 transition-colors border-l border-border",
                view === "list" ? "bg-navy-900 text-cream-100" : "hover:bg-muted text-muted-foreground"
              )}
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Active filter chips */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          {Array.from(urlParams.entries())
            .filter(([k]) => !["sortBy", "page", "view"].includes(k))
            .map(([key, value]) => (
              <div
                key={key}
                className="flex items-center gap-1.5 bg-gold-500/10 text-gold-700 dark:text-gold-400 text-xs px-3 py-1.5 rounded-full border border-gold-500/20"
              >
                <span className="font-medium capitalize">{key.replace(/([A-Z])/g, " $1")}:</span>
                <span>{value}</span>
                <button
                  onClick={() => clearFilter(key)}
                  aria-label={`Remove ${key} filter`}
                  className="hover:text-red-500 transition-colors ml-0.5"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          <button
            onClick={() => router.push(pathname)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1.5 rounded-full hover:bg-muted"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Property Grid/List */}
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="skeleton"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={cn(
              view === "grid"
                ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5"
                : "flex flex-col gap-4"
            )}
          >
            {Array.from({ length: 9 }).map((_, i) => (
              <PropertyCardSkeleton key={i} view={view} />
            ))}
          </motion.div>
        ) : properties.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-24 text-center"
          >
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
              <SlidersHorizontal size={32} className="text-muted-foreground" />
            </div>
            <h3 className="font-display text-2xl font-light text-foreground mb-2">
              No properties found
            </h3>
            <p className="text-muted-foreground max-w-sm mb-6">
              Try adjusting your filters or search terms to find more results.
            </p>
            <button
              onClick={() => router.push(pathname)}
              className="btn-navy"
            >
              Clear all filters
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={cn(
              view === "grid"
                ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5"
                : "flex flex-col gap-4"
            )}
          >
            {properties.map((property, i) => (
              <PropertyCard
                key={property.id}
                property={property}
                view={view}
                priority={i < 3}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pagination */}
      {meta && meta.totalPages > 1 && !loading && (
        <div className="flex items-center justify-center gap-2 mt-10" role="navigation" aria-label="Pagination">
          <button
            onClick={() => handlePageChange(meta.page - 1)}
            disabled={!meta.hasPrevPage}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium border transition-all",
              meta.hasPrevPage
                ? "border-border hover:border-gold-500 hover:text-gold-600 text-foreground"
                : "border-border/50 text-muted-foreground/50 cursor-not-allowed"
            )}
            aria-label="Previous page"
          >
            ← Previous
          </button>

          {/* Page numbers */}
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(meta.totalPages, 7) }, (_, i) => {
              let page: number;
              const total = meta.totalPages;
              const current = meta.page;
              if (total <= 7) {
                page = i + 1;
              } else if (current <= 4) {
                page = i + 1;
              } else if (current >= total - 3) {
                page = total - 6 + i;
              } else {
                page = current - 3 + i;
              }
              return (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  aria-label={`Page ${page}`}
                  aria-current={meta.page === page ? "page" : undefined}
                  className={cn(
                    "w-9 h-9 rounded-lg text-sm font-medium transition-all",
                    meta.page === page
                      ? "bg-navy-900 text-cream-100 shadow-luxury"
                      : "hover:bg-muted text-foreground"
                  )}
                >
                  {page}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => handlePageChange(meta.page + 1)}
            disabled={!meta.hasNextPage}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium border transition-all",
              meta.hasNextPage
                ? "border-border hover:border-gold-500 hover:text-gold-600 text-foreground"
                : "border-border/50 text-muted-foreground/50 cursor-not-allowed"
            )}
            aria-label="Next page"
          >
            Next →
          </button>
        </div>
      )}

      {/* Mobile Filters Drawer */}
      <AnimatePresence>
        {mobileFiltersOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileFiltersOpen(false)}
              className="fixed inset-0 z-40 bg-navy-900/60 backdrop-blur-sm lg:hidden"
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="fixed top-0 left-0 bottom-0 z-50 w-80 max-w-full bg-card shadow-luxury-xl overflow-y-auto lg:hidden"
            >
              <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card z-10">
                <h2 className="font-semibold text-foreground">Filters</h2>
                <button
                  onClick={() => setMobileFiltersOpen(false)}
                  aria-label="Close filters"
                  className="p-2 rounded-lg hover:bg-muted transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="p-4">
                <PropertyFiltersPanel
                  searchParams={Object.fromEntries(urlParams.entries())}
                  onApply={() => setMobileFiltersOpen(false)}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
