"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Search, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDebouncedCallback } from "@/hooks/useDebounce";

const PROPERTY_TYPES = [
  "Apartment", "Villa", "Townhouse", "Office",
  "Warehouse", "Land / Plot", "Short Stay", "Studio",
];

const AMENITIES = [
  { id: "parking", label: "Parking" },
  { id: "pool", label: "Swimming Pool" },
  { id: "gym", label: "Gym / Fitness" },
  { id: "garden", label: "Garden" },
  { id: "security", label: "24/7 Security" },
  { id: "balcony", label: "Balcony" },
  { id: "furnished", label: "Furnished" },
  { id: "generator", label: "Generator" },
  { id: "fiber", label: "Fibre Internet" },
  { id: "cctv", label: "CCTV" },
];

interface FilterSection {
  id: string;
  label: string;
  defaultOpen?: boolean;
}

const SECTIONS: FilterSection[] = [
  { id: "type", label: "Listing Type", defaultOpen: true },
  { id: "category", label: "Property Category", defaultOpen: true },
  { id: "price", label: "Price Range", defaultOpen: true },
  { id: "rooms", label: "Bedrooms & Bathrooms", defaultOpen: true },
  { id: "location", label: "Location", defaultOpen: true },
  { id: "size", label: "Property Size" },
  { id: "amenities", label: "Amenities" },
];

interface PropertyFiltersPanelProps {
  searchParams: Record<string, string | undefined>;
  onApply?: () => void;
}

export function PropertyFiltersPanel({ searchParams, onApply }: PropertyFiltersPanelProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [openSections, setOpenSections] = useState<Set<string>>(
    new Set(SECTIONS.filter((s) => s.defaultOpen).map((s) => s.id))
  );

  // Filter state
  const [listingType, setListingType] = useState<string>(searchParams.listingType ?? "");
  const [categories, setCategories] = useState<string[]>(
    searchParams.category ? searchParams.category.split(",") : []
  );
  const [propertyTypes, setPropertyTypes] = useState<string[]>(
    searchParams.propertyType ? searchParams.propertyType.split(",") : []
  );
  const [minPrice, setMinPrice] = useState(searchParams.minPrice ?? "");
  const [maxPrice, setMaxPrice] = useState(searchParams.maxPrice ?? "");
  const [bedrooms, setBedrooms] = useState(searchParams.bedrooms ?? "");
  const [bathrooms, setBathrooms] = useState(searchParams.bathrooms ?? "");
  const [city, setCity] = useState(searchParams.city ?? "");
  const [area, setArea] = useState(searchParams.area ?? "");
  const [minSqft, setMinSqft] = useState(searchParams.minSqft ?? "");
  const [maxSqft, setMaxSqft] = useState(searchParams.maxSqft ?? "");
  const [amenities, setAmenities] = useState<string[]>(
    searchParams.amenities ? searchParams.amenities.split(",") : []
  );
  const [keywords, setKeywords] = useState(searchParams.keywords ?? "");

  const toggleSection = (id: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const applyFilters = useCallback(() => {
    const params = new URLSearchParams();
    if (listingType) params.set("listingType", listingType);
    if (categories.length) params.set("category", categories.join(","));
    if (propertyTypes.length) params.set("propertyType", propertyTypes.join(","));
    if (minPrice) params.set("minPrice", minPrice);
    if (maxPrice) params.set("maxPrice", maxPrice);
    if (bedrooms) params.set("bedrooms", bedrooms);
    if (bathrooms) params.set("bathrooms", bathrooms);
    if (city) params.set("city", city);
    if (area) params.set("area", area);
    if (minSqft) params.set("minSqft", minSqft);
    if (maxSqft) params.set("maxSqft", maxSqft);
    if (amenities.length) params.set("amenities", amenities.join(","));
    if (keywords) params.set("keywords", keywords);
    const qs = params.toString();
    router.push(`${pathname}${qs ? "?" + qs : ""}`, { scroll: false });
    onApply?.();
  }, [listingType, categories, propertyTypes, minPrice, maxPrice,
    bedrooms, bathrooms, city, area, minSqft, maxSqft, amenities, keywords,
    router, pathname, onApply]);

  const resetFilters = () => {
    setListingType(""); setCategories([]); setPropertyTypes([]);
    setMinPrice(""); setMaxPrice(""); setBedrooms(""); setBathrooms("");
    setCity(""); setArea(""); setMinSqft(""); setMaxSqft("");
    setAmenities([]); setKeywords("");
    router.push(pathname, { scroll: false });
    onApply?.();
  };

  const debouncedApply = useDebouncedCallback(applyFilters, 400);

  // Auto-apply on changes
  useEffect(() => { debouncedApply(); }, [
    listingType, categories, propertyTypes, minPrice, maxPrice,
    bedrooms, bathrooms, city, area, minSqft, maxSqft, amenities,
  ]);

  const hasFilters = !!(listingType || categories.length || propertyTypes.length ||
    minPrice || maxPrice || bedrooms || bathrooms || city || area ||
    minSqft || maxSqft || amenities.length || keywords);

  const toggleArray = (arr: string[], setArr: (v: string[]) => void, val: string) => {
    setArr(arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]);
  };

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden shadow-luxury sticky top-24">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
        <h2 className="font-semibold text-sm text-foreground">Filters</h2>
        {hasFilters && (
          <button
            onClick={resetFilters}
            className="text-xs text-gold-600 hover:text-gold-700 font-medium transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      <div className="divide-y divide-border max-h-[calc(100vh-140px)] overflow-y-auto">

        {/* Keywords */}
        <div className="p-4">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Keywords..."
              value={keywords}
              onChange={(e) => { setKeywords(e.target.value); debouncedApply(); }}
              className="input-luxury pl-9 text-sm py-2.5"
              aria-label="Search by keywords"
            />
          </div>
        </div>

        {/* Listing Type */}
        <FilterSectionWrapper
          id="type"
          label="Listing Type"
          open={openSections.has("type")}
          onToggle={() => toggleSection("type")}
        >
          <div className="flex gap-2">
            {[
              { value: "", label: "All" },
              { value: "SALE", label: "For Sale" },
              { value: "RENT", label: "For Rent" },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setListingType(opt.value)}
                className={cn(
                  "flex-1 py-2 text-sm font-medium rounded-lg border transition-all",
                  listingType === opt.value
                    ? "bg-navy-900 text-cream-100 border-navy-900"
                    : "border-border text-foreground hover:border-navy-500 hover:bg-muted"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </FilterSectionWrapper>

        {/* Category */}
        <FilterSectionWrapper
          id="category"
          label="Category"
          open={openSections.has("category")}
          onToggle={() => toggleSection("category")}
        >
          <div className="grid grid-cols-2 gap-2">
            {["RESIDENTIAL", "COMMERCIAL", "LAND", "SHORT_STAY"].map((cat) => (
              <button
                key={cat}
                onClick={() => toggleArray(categories, setCategories, cat)}
                className={cn(
                  "py-2 px-3 text-xs font-medium rounded-lg border text-left transition-all",
                  categories.includes(cat)
                    ? "bg-gold-500/15 border-gold-500/60 text-gold-700 dark:text-gold-400"
                    : "border-border text-foreground hover:border-gold-500/30 hover:bg-gold-500/5"
                )}
              >
                {cat.replace("_", " ")}
              </button>
            ))}
          </div>
        </FilterSectionWrapper>

        {/* Property Type */}
        <FilterSectionWrapper
          id="proptype"
          label="Property Type"
          open={openSections.has("proptype")}
          onToggle={() => toggleSection("proptype")}
        >
          <div className="flex flex-wrap gap-1.5">
            {PROPERTY_TYPES.map((type) => (
              <button
                key={type}
                onClick={() => toggleArray(propertyTypes, setPropertyTypes, type)}
                className={cn(
                  "py-1.5 px-3 text-xs font-medium rounded-full border transition-all",
                  propertyTypes.includes(type)
                    ? "bg-navy-900 text-cream-100 border-navy-900"
                    : "border-border text-foreground hover:border-navy-400 hover:bg-muted"
                )}
              >
                {type}
              </button>
            ))}
          </div>
        </FilterSectionWrapper>

        {/* Price Range */}
        <FilterSectionWrapper
          id="price"
          label="Price Range"
          open={openSections.has("price")}
          onToggle={() => toggleSection("price")}
        >
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground mb-1 block">Min ($)</label>
              <input
                type="number"
                placeholder="0"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className="input-luxury text-sm py-2"
                min={0}
              />
            </div>
            <div className="flex items-end pb-2 text-muted-foreground text-sm">—</div>
            <div className="flex-1">
              <label className="text-xs text-muted-foreground mb-1 block">Max ($)</label>
              <input
                type="number"
                placeholder="Any"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="input-luxury text-sm py-2"
                min={0}
              />
            </div>
          </div>
          {/* Quick price ranges */}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {[
              { label: "< $100K", min: "", max: "100000" },
              { label: "$100K–500K", min: "100000", max: "500000" },
              { label: "$500K–1M", min: "500000", max: "1000000" },
              { label: "$1M+", min: "1000000", max: "" },
            ].map((r) => (
              <button
                key={r.label}
                onClick={() => { setMinPrice(r.min); setMaxPrice(r.max); }}
                className={cn(
                  "px-2.5 py-1 text-xs rounded-full border transition-all",
                  minPrice === r.min && maxPrice === r.max
                    ? "bg-gold-500/15 border-gold-500/60 text-gold-700 dark:text-gold-400"
                    : "border-border text-muted-foreground hover:border-gold-500/30"
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
        </FilterSectionWrapper>

        {/* Bedrooms & Bathrooms */}
        <FilterSectionWrapper
          id="rooms"
          label="Beds & Baths"
          open={openSections.has("rooms")}
          onToggle={() => toggleSection("rooms")}
        >
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Bedrooms</label>
              <div className="flex gap-1.5">
                {["", "1", "2", "3", "4", "5+"].map((n) => (
                  <button
                    key={n}
                    onClick={() => setBedrooms(n)}
                    className={cn(
                      "flex-1 py-1.5 text-xs font-medium rounded-lg border transition-all",
                      bedrooms === n
                        ? "bg-navy-900 text-cream-100 border-navy-900"
                        : "border-border text-foreground hover:bg-muted"
                    )}
                  >
                    {n || "Any"}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Bathrooms</label>
              <div className="flex gap-1.5">
                {["", "1", "2", "3", "4+"].map((n) => (
                  <button
                    key={n}
                    onClick={() => setBathrooms(n)}
                    className={cn(
                      "flex-1 py-1.5 text-xs font-medium rounded-lg border transition-all",
                      bathrooms === n
                        ? "bg-navy-900 text-cream-100 border-navy-900"
                        : "border-border text-foreground hover:bg-muted"
                    )}
                  >
                    {n || "Any"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </FilterSectionWrapper>

        {/* Location */}
        <FilterSectionWrapper
          id="location"
          label="Location"
          open={openSections.has("location")}
          onToggle={() => toggleSection("location")}
        >
          <div className="space-y-2">
            <input
              type="text"
              placeholder="City..."
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="input-luxury text-sm py-2.5"
              aria-label="Filter by city"
            />
            <input
              type="text"
              placeholder="Area / Neighborhood..."
              value={area}
              onChange={(e) => setArea(e.target.value)}
              className="input-luxury text-sm py-2.5"
              aria-label="Filter by area"
            />
          </div>
        </FilterSectionWrapper>

        {/* Size */}
        <FilterSectionWrapper
          id="size"
          label="Property Size (sqft)"
          open={openSections.has("size")}
          onToggle={() => toggleSection("size")}
        >
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground mb-1 block">Min</label>
              <input
                type="number"
                placeholder="0"
                value={minSqft}
                onChange={(e) => setMinSqft(e.target.value)}
                className="input-luxury text-sm py-2"
                min={0}
              />
            </div>
            <div className="flex items-end pb-2 text-muted-foreground text-sm">—</div>
            <div className="flex-1">
              <label className="text-xs text-muted-foreground mb-1 block">Max</label>
              <input
                type="number"
                placeholder="Any"
                value={maxSqft}
                onChange={(e) => setMaxSqft(e.target.value)}
                className="input-luxury text-sm py-2"
                min={0}
              />
            </div>
          </div>
        </FilterSectionWrapper>

        {/* Amenities */}
        <FilterSectionWrapper
          id="amenities"
          label="Amenities"
          open={openSections.has("amenities")}
          onToggle={() => toggleSection("amenities")}
        >
          <div className="space-y-2">
            {AMENITIES.map((amenity) => (
              <label
                key={amenity.id}
                className="flex items-center gap-3 cursor-pointer group"
              >
                <input
                  type="checkbox"
                  checked={amenities.includes(amenity.id)}
                  onChange={() => toggleArray(amenities, setAmenities, amenity.id)}
                  className="w-4 h-4 rounded border-border accent-gold-500 cursor-pointer"
                />
                <span className="text-sm text-foreground group-hover:text-gold-600 transition-colors">
                  {amenity.label}
                </span>
              </label>
            ))}
          </div>
        </FilterSectionWrapper>
      </div>

      {/* Apply button for mobile */}
      <div className="p-4 border-t border-border lg:hidden">
        <button onClick={applyFilters} className="btn-gold w-full justify-center">
          Apply Filters
        </button>
      </div>
    </div>
  );
}

function FilterSectionWrapper({
  id, label, open, onToggle, children,
}: {
  id: string;
  label: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="px-4 py-3">
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full text-left mb-3 group"
        aria-expanded={open}
      >
        <span className="text-sm font-semibold text-foreground group-hover:text-gold-600 transition-colors">
          {label}
        </span>
        {open ? (
          <ChevronUp size={14} className="text-muted-foreground" />
        ) : (
          <ChevronDown size={14} className="text-muted-foreground" />
        )}
      </button>
      {open && <div className="space-y-2">{children}</div>}
    </div>
  );
}
