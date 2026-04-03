"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, MapPin, Home, Building2, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";
import { cn, buildQueryString } from "@/lib/utils";

const PROPERTY_TYPES = [
  "All Types",
  "Apartment",
  "Villa",
  "Townhouse",
  "Office",
  "Warehouse",
  "Land / Plot",
  "Short Stay",
];

export function HeroSection() {
  const router = useRouter();
  const [listingType, setListingType] = useState<"SALE" | "RENT">("SALE");
  const [location, setLocation] = useState("");
  const [propertyType, setPropertyType] = useState("All Types");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params: Record<string, string> = {
      listingType,
    };
    if (location.trim()) params.city = location.trim();
    if (propertyType && propertyType !== "All Types") params.propertyType = propertyType;
    router.push(`/properties${buildQueryString(params)}`);
  };

  return (
    <section
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
      aria-label="Hero section"
    >
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-luxury" />

      {/* Animated background overlay */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[url('/hero-bg.jpg')] bg-cover bg-center opacity-25 mix-blend-luminosity" />
        {/* Geometric decoration */}
        <div className="absolute top-1/4 right-1/4 w-96 h-96 rounded-full border border-gold-500/10 animate-[spin_30s_linear_infinite]" />
        <div className="absolute top-1/3 right-1/3 w-64 h-64 rounded-full border border-gold-500/5 animate-[spin_20s_linear_infinite_reverse]" />
        <div className="absolute inset-0 bg-noise opacity-30" />
      </div>

      {/* Content */}
      <div className="relative z-10 section-container text-center py-20">
        {/* Eyebrow */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 mb-6"
        >
          <div className="h-px w-8 bg-gold-500" />
          <span className="eyebrow text-gold-400">Exceptional Properties Await</span>
          <div className="h-px w-8 bg-gold-500" />
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="font-display text-display-xl lg:text-display-2xl font-light text-cream-100 text-balance mb-6 leading-[1.05]"
        >
          Find Your
          <span className="block italic text-gradient-gold mt-1">Perfect Home</span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="text-cream-300 text-lg max-w-2xl mx-auto mb-12 font-light leading-relaxed"
        >
          Discover over 500 curated residential and commercial properties.
          Expert guidance from search to settlement.
        </motion.p>

        {/* Search Card */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.35 }}
          className="max-w-3xl mx-auto"
        >
          <div className="glass-dark rounded-2xl p-2 shadow-luxury-xl">
            {/* Buy/Rent Toggle */}
            <div className="flex mb-2 p-1">
              {(["SALE", "RENT"] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setListingType(type)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all duration-200",
                    listingType === type
                      ? "bg-gold-500 text-navy-900"
                      : "text-cream-300 hover:text-cream-100"
                  )}
                >
                  {type === "SALE" ? (
                    <><Home size={15} /> Buy</>
                  ) : (
                    <><Building2 size={15} /> Rent</>
                  )}
                </button>
              ))}
            </div>

            {/* Search Form */}
            <form onSubmit={handleSearch}>
              <div className="flex flex-col sm:flex-row gap-2 p-1">
                {/* Location Input */}
                <div className="flex-1 relative">
                  <MapPin
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gold-500 pointer-events-none"
                  />
                  <input
                    type="text"
                    placeholder="City, area, or address..."
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full bg-white/10 text-cream-100 placeholder:text-cream-400 text-sm rounded-xl pl-10 pr-4 py-3.5 border border-white/10 focus:outline-none focus:border-gold-500/60 focus:bg-white/15 transition-all"
                    aria-label="Location search"
                  />
                </div>

                {/* Property Type Select */}
                <div className="relative sm:w-48">
                  <Home
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gold-500 pointer-events-none"
                  />
                  <select
                    value={propertyType}
                    onChange={(e) => setPropertyType(e.target.value)}
                    className="w-full appearance-none bg-white/10 text-cream-100 text-sm rounded-xl pl-10 pr-8 py-3.5 border border-white/10 focus:outline-none focus:border-gold-500/60 transition-all cursor-pointer"
                    aria-label="Property type"
                  >
                    {PROPERTY_TYPES.map((t) => (
                      <option key={t} value={t} className="bg-navy-900 text-cream-100">
                        {t}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={14}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-cream-400 pointer-events-none"
                  />
                </div>

                {/* Search Button */}
                <button
                  type="submit"
                  className="btn-gold px-8 py-3.5 rounded-xl font-semibold text-sm shrink-0 flex items-center gap-2"
                >
                  <Search size={16} />
                  Search
                </button>
              </div>
            </form>
          </div>

          {/* Quick Stats */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="flex items-center justify-center gap-8 mt-8 text-cream-400 text-sm"
          >
            {[
              { label: "Properties Listed", value: "500+" },
              { label: "Happy Clients", value: "2,000+" },
              { label: "Cities Covered", value: "24" },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="text-cream-100 font-semibold text-lg font-display">{item.value}</div>
                <div className="text-xs text-cream-500 mt-0.5">{item.label}</div>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-cream-500"
      >
        <span className="text-xs tracking-widest uppercase">Explore</span>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="w-px h-10 bg-gradient-to-b from-gold-500 to-transparent"
        />
      </motion.div>
    </section>
  );
}
