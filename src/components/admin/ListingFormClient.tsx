"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Save, Eye, ArrowLeft, ArrowRight } from "lucide-react";
import { cn, generateSlug } from "@/lib/utils";
import { toast } from "@/components/ui/toaster";
import type { Role } from "@/types";

const schema = z.object({
  title:           z.string().min(3, "Title must be at least 3 characters"),
  slug:            z.string().min(3),
  listingType:     z.enum(["SALE", "RENT"]),
  category:        z.enum(["RESIDENTIAL", "COMMERCIAL", "LAND", "SHORT_STAY"]),
  propertyType:    z.string().min(1, "Property type is required"),
  status:          z.enum(["DRAFT", "PUBLISHED", "UNDER_OFFER", "SOLD", "RENTED", "ARCHIVED"]),
  price:           z.coerce.number().positive("Price must be positive"),
  currency:        z.string().default("USD"),
  priceNegotiable: z.boolean().default(false),
  bedrooms:        z.coerce.number().int().min(0).optional().nullable(),
  bathrooms:       z.coerce.number().int().min(0).optional().nullable(),
  parkingSpaces:   z.coerce.number().int().min(0).optional().nullable(),
  squareFootage:   z.coerce.number().min(0).optional().nullable(),
  landSize:        z.coerce.number().min(0).optional().nullable(),
  yearBuilt:       z.coerce.number().int().optional().nullable(),
  furnishingStatus:z.string().optional().nullable(),
  description:     z.string().min(10, "Description must be at least 10 characters"),
  address:         z.string().min(3, "Address is required"),
  city:            z.string().min(1, "City is required"),
  area:            z.string().optional().nullable(),
  country:         z.string().min(1, "Country is required"),
  latitude:        z.coerce.number().optional().nullable(),
  longitude:       z.coerce.number().optional().nullable(),
  isFeatured:      z.boolean().default(false),
  metaTitle:       z.string().optional().nullable(),
  metaDescription: z.string().optional().nullable(),
  videoUrl:        z.string().url().optional().nullable().or(z.literal("")),
  agentId:         z.string().optional().nullable(),
});

type FormData = z.infer<typeof schema>;

const STEPS = ["Basic Info", "Location", "Details", "Description", "SEO & Publish"] as const;

interface Amenity  { id: string; name: string; category: string | null }
interface Agent    { id: string; name: string }

interface ListingFormClientProps {
  listing:       any | null;
  amenities:     Amenity[];
  agents:        Agent[];
  currentUserId: string;
  userRole:      Role;
}

export function ListingFormClient({
  listing, amenities, agents, currentUserId, userRole,
}: ListingFormClientProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>(
    listing?.amenities?.map((a: any) => a.amenityId) ?? []
  );
  const isNew    = !listing;
  const isAgent  = userRole === "AGENT";

  const {
    register, handleSubmit, watch, setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: listing
      ? {
          ...listing,
          price:    listing.price,
          bedrooms: listing.bedrooms,
          bathrooms:listing.bathrooms,
        }
      : {
          listingType: "SALE",
          category:    "RESIDENTIAL",
          propertyType:"Apartment",
          status:      "DRAFT",
          currency:    "USD",
          country:     "Uganda",
          isFeatured:  false,
          priceNegotiable: false,
        },
  });

  const titleValue = watch("title");

  const autoSlug = useCallback(() => {
    const city = watch("city") || "";
    const raw  = titleValue ? `${titleValue} ${city}` : "";
    if (raw.trim()) setValue("slug", generateSlug(raw));
  }, [titleValue, watch, setValue]);

  const onSubmit = async (data: FormData) => {
    setSaving(true);
    try {
      const payload = { ...data, amenityIds: selectedAmenities };
      const url     = isNew ? "/api/admin/listings" : `/api/admin/listings/${listing.id}`;
      const method  = isNew ? "POST" : "PATCH";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Save failed");

      toast({
        title: isNew ? "Listing created!" : "Listing updated!",
        description: data.status === "PUBLISHED" ? "Now live on the site." : "Saved as draft.",
        variant: "success",
      });
      router.push(`/admin/listings/${result.property?.id ?? listing?.id}`);
      router.refresh();
    } catch (err: any) {
      toast({ title: "Failed to save", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const inputCls = (err?: any) =>
    cn("input-luxury", err && "border-red-400 focus:border-red-400");

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      {/* Step indicator */}
      <div className="flex items-center gap-1 mb-8 overflow-x-auto no-scrollbar pb-1">
        {STEPS.map((s, i) => (
          <button
            key={s}
            type="button"
            onClick={() => setStep(i)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all border",
              step === i
                ? "bg-navy-900 text-cream-100 border-navy-900 shadow-luxury"
                : i < step
                ? "bg-gold-500/10 text-gold-700 border-gold-500/30"
                : "border-border text-muted-foreground hover:bg-muted"
            )}
          >
            <span className={cn(
              "w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold",
              step === i ? "bg-gold-500 text-navy-900" : i < step ? "bg-gold-500/30 text-gold-700" : "bg-muted text-muted-foreground"
            )}>
              {i + 1}
            </span>
            {s}
          </button>
        ))}
      </div>

      {/* Step 0 — Basic Info */}
      {step === 0 && (
        <div className="bg-card rounded-xl border border-border shadow-luxury p-6 space-y-5">
          <h2 className="font-semibold text-foreground">Basic Information</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-foreground mb-1 block">Title *</label>
              <input
                {...register("title", { onBlur: autoSlug })}
                placeholder="e.g. Stunning 3-Bedroom Villa in Kololo"
                className={inputCls(errors.title)}
              />
              {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>}
            </div>

            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">URL Slug *</label>
              <input {...register("slug")} className={inputCls(errors.slug)} />
              {errors.slug && <p className="text-xs text-red-500 mt-1">{errors.slug.message}</p>}
            </div>

            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">Listing Type *</label>
              <select {...register("listingType")} className="input-luxury">
                <option value="SALE">For Sale</option>
                <option value="RENT">For Rent</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">Category *</label>
              <select {...register("category")} className="input-luxury">
                <option value="RESIDENTIAL">Residential</option>
                <option value="COMMERCIAL">Commercial</option>
                <option value="LAND">Land / Plot</option>
                <option value="SHORT_STAY">Short Stay</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">Property Type *</label>
              <select {...register("propertyType")} className="input-luxury">
                {["Apartment","Villa","Townhouse","Office","Warehouse","Land / Plot","Studio","Short Stay","Maisonette"].map(
                  (t) => <option key={t} value={t}>{t}</option>
                )}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">Status *</label>
              <select {...register("status")} className="input-luxury" disabled={isAgent}>
                <option value="DRAFT">Draft</option>
                {!isAgent && <option value="PUBLISHED">Published</option>}
                {!isAgent && <option value="UNDER_OFFER">Under Offer</option>}
                {!isAgent && <option value="SOLD">Sold</option>}
                {!isAgent && <option value="RENTED">Rented</option>}
                {!isAgent && <option value="ARCHIVED">Archived</option>}
              </select>
              {isAgent && (
                <p className="text-xs text-muted-foreground mt-1">Agents save as Draft — an admin will publish.</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 sm:col-span-2">
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">Price *</label>
                <input
                  type="number"
                  {...register("price")}
                  placeholder="250000"
                  className={inputCls(errors.price)}
                />
                {errors.price && <p className="text-xs text-red-500 mt-1">{errors.price.message}</p>}
              </div>
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">Currency</label>
                <select {...register("currency")} className="input-luxury">
                  {["USD","EUR","GBP","UGX","KES","NGN","ZAR"].map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input type="checkbox" id="negotiable" {...register("priceNegotiable")} className="accent-gold-500" />
              <label htmlFor="negotiable" className="text-sm text-foreground cursor-pointer">Price is negotiable</label>
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="featured" {...register("isFeatured")} className="accent-gold-500" disabled={isAgent} />
              <label htmlFor="featured" className={cn("text-sm cursor-pointer", isAgent ? "text-muted-foreground" : "text-foreground")}>
                Feature on homepage
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Step 1 — Location */}
      {step === 1 && (
        <div className="bg-card rounded-xl border border-border shadow-luxury p-6 space-y-5">
          <h2 className="font-semibold text-foreground">Location</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-foreground mb-1 block">Street Address *</label>
              <input {...register("address")} placeholder="Plot 45, Kololo Hill Drive" className={inputCls(errors.address)} />
              {errors.address && <p className="text-xs text-red-500 mt-1">{errors.address.message}</p>}
            </div>
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">City *</label>
              <input {...register("city")} placeholder="Kampala" className={inputCls(errors.city)} />
              {errors.city && <p className="text-xs text-red-500 mt-1">{errors.city.message}</p>}
            </div>
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">Area / Neighbourhood</label>
              <input {...register("area")} placeholder="Kololo" className="input-luxury" />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">Country *</label>
              <input {...register("country")} placeholder="Uganda" className={inputCls(errors.country)} />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">Latitude</label>
              <input type="number" step="any" {...register("latitude")} placeholder="0.3322" className="input-luxury" />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">Longitude</label>
              <input type="number" step="any" {...register("longitude")} placeholder="32.5827" className="input-luxury" />
            </div>
          </div>
        </div>
      )}

      {/* Step 2 — Details & Amenities */}
      {step === 2 && (
        <div className="space-y-5">
          <div className="bg-card rounded-xl border border-border shadow-luxury p-6 space-y-4">
            <h2 className="font-semibold text-foreground">Property Details</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[
                { label: "Bedrooms",      field: "bedrooms"      },
                { label: "Bathrooms",     field: "bathrooms"     },
                { label: "Parking Spaces",field: "parkingSpaces" },
                { label: "Interior (sqft)",field:"squareFootage" },
                { label: "Land Size (sqft)",field:"landSize"     },
                { label: "Year Built",    field: "yearBuilt"     },
              ].map(({ label, field }) => (
                <div key={field}>
                  <label className="text-xs font-medium text-foreground mb-1 block">{label}</label>
                  <input
                    type="number"
                    {...register(field as keyof FormData)}
                    placeholder="—"
                    className="input-luxury text-sm"
                  />
                </div>
              ))}
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">Furnishing</label>
                <select {...register("furnishingStatus")} className="input-luxury text-sm">
                  <option value="">Unknown</option>
                  <option value="Fully Furnished">Fully Furnished</option>
                  <option value="Semi-Furnished">Semi-Furnished</option>
                  <option value="Unfurnished">Unfurnished</option>
                </select>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl border border-border shadow-luxury p-6">
            <h2 className="font-semibold text-foreground mb-4">Amenities</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {amenities.map((a) => (
                <label key={a.id} className="flex items-center gap-2.5 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={selectedAmenities.includes(a.id)}
                    onChange={() =>
                      setSelectedAmenities((prev) =>
                        prev.includes(a.id) ? prev.filter((x) => x !== a.id) : [...prev, a.id]
                      )
                    }
                    className="accent-gold-500 w-4 h-4"
                  />
                  <span className="text-sm text-foreground group-hover:text-gold-600 transition-colors">{a.name}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Step 3 — Description */}
      {step === 3 && (
        <div className="bg-card rounded-xl border border-border shadow-luxury p-6 space-y-4">
          <h2 className="font-semibold text-foreground">Description</h2>
          <div>
            <label className="text-xs font-medium text-foreground mb-1 block">
              Property Description * (HTML supported)
            </label>
            <textarea
              {...register("description")}
              rows={12}
              placeholder="<p>Write a detailed description of the property...</p>"
              className={cn("input-luxury text-sm resize-y font-mono", errors.description && "border-red-400")}
            />
            {errors.description && (
              <p className="text-xs text-red-500 mt-1">{errors.description.message}</p>
            )}
          </div>
          <div>
            <label className="text-xs font-medium text-foreground mb-1 block">Video / Virtual Tour URL</label>
            <input
              {...register("videoUrl")}
              placeholder="https://www.youtube.com/watch?v=..."
              className="input-luxury text-sm"
            />
          </div>
        </div>
      )}

      {/* Step 4 — SEO & Publish */}
      {step === 4 && (
        <div className="space-y-5">
          <div className="bg-card rounded-xl border border-border shadow-luxury p-6 space-y-4">
            <h2 className="font-semibold text-foreground">SEO</h2>
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">Meta Title</label>
              <input {...register("metaTitle")} placeholder="Auto-generated from title if empty" className="input-luxury text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">Meta Description</label>
              <textarea {...register("metaDescription")} rows={2} placeholder="160 character summary..." className="input-luxury text-sm resize-none" />
            </div>
          </div>
          {agents.length > 0 && (
            <div className="bg-card rounded-xl border border-border shadow-luxury p-6">
              <h2 className="font-semibold text-foreground mb-3">Assign Agent</h2>
              <select {...register("agentId")} className="input-luxury text-sm">
                <option value="">Unassigned</option>
                {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between mt-6 pt-6 border-t border-border">
        <div className="flex gap-3">
          {step > 0 && (
            <button type="button" onClick={() => setStep(step - 1)} className="btn-navy flex items-center gap-2">
              <ArrowLeft size={16} /> Back
            </button>
          )}
        </div>
        <div className="flex gap-3">
          {step < STEPS.length - 1 ? (
            <button type="button" onClick={() => setStep(step + 1)} className="btn-gold flex items-center gap-2">
              Next <ArrowRight size={16} />
            </button>
          ) : (
            <button type="submit" disabled={saving} className="btn-gold flex items-center gap-2">
              {saving ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : <><Save size={16} /> Save Listing</>}
            </button>
          )}
          {/* Quick save at any step */}
          {step < STEPS.length - 1 && (
            <button type="submit" disabled={saving} className="btn-navy flex items-center gap-2 text-sm">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Save Draft
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
