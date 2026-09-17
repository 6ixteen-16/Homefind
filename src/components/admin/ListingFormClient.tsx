"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Save, Eye, ArrowLeft, ArrowRight, Image as ImageIcon, Trash2, Star, Plus, Link2 } from "lucide-react";
import { cn, generateSlug } from "@/lib/utils";
import { toast } from "@/components/ui/toaster";
import type { Role } from "@/types";

// Compress image in the browser and return a small base64 data URL.
// This avoids any server-side filesystem dependency (required for Vercel).
const compressImage = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new window.Image();
      img.src = e.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX = 900; // max dimension in pixels
        let { width, height } = img;
        if (width > height) {
          if (width > MAX) { height = Math.round((height * MAX) / width); width = MAX; }
        } else {
          if (height > MAX) { width = Math.round((width * MAX) / height); height = MAX; }
        }
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d")?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.72)); // ~72% quality keeps images sharp but small
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });

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
  description:     z.string().min(10, "Description must be at least 10 characters").default(""),
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
  agencyId:        z.string().optional().nullable(),
});

type FormData = z.infer<typeof schema>;

const STEPS = ["Basic Info", "Location", "Details", "Description", "Media", "SEO & Publish"] as const;

interface Amenity  { id: string; name: string; category: string | null }
interface Agent    { id: string; name: string }
interface Agency   { id: string; name: string }

interface ListingFormClientProps {
  listing:       any | null;
  amenities:     Amenity[];
  agents:        Agent[];
  agencies:      Agency[];
  currentUserId: string;
  userRole:      Role;
}

export function ListingFormClient({
  listing, amenities, agents, agencies, currentUserId, userRole,
}: ListingFormClientProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>(
    listing?.amenities?.map((a: any) => a.amenityId) ?? []
  );
  const [mediaImages, setMediaImages] = useState<any[]>(listing?.media ?? []);
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [addingImage, setAddingImage] = useState(false);
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
          price:       listing.price,
          bedrooms:    listing.bedrooms,
          bathrooms:   listing.bathrooms,
          description: listing.description ?? "",
        }
      : {
          listingType:     "SALE",
          category:        "RESIDENTIAL",
          propertyType:    "Apartment",
          status:          "DRAFT",
          currency:        "USD",
          country:         "Uganda",
          isFeatured:      false,
          priceNegotiable: false,
          description:     "",
        },
  });

  const titleValue = watch("title");

  const autoSlug = useCallback(() => {
    const city = watch("city") || "";
    const raw  = titleValue ? `${titleValue} ${city}` : "";
    if (raw.trim()) setValue("slug", generateSlug(raw));
  }, [titleValue, watch, setValue]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    setAddingImage(true);
    
    try {
      const files = Array.from(e.target.files);
      
      for (const file of files) {
        // Compress image client-side - produces a small base64 data URL
        const dataUrl = await compressImage(file);
        
        if (isNew) {
          // Queue image to attach after listing is created
          setMediaImages((prev) => [...prev, {
            id: `temp-${Date.now()}-${Math.random()}`,
            url: dataUrl,
            type: "IMAGE",
            isFeatured: prev.length === 0,
            sortOrder: prev.length,
            altText: null,
            width: null,
            height: null,
          }]);
        } else {
          // Immediately save to the existing listing
          const res = await fetch(`/api/admin/listings/${listing.id}/media`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: dataUrl, type: "IMAGE" }),
          });
          const result = await res.json();
          if (!res.ok) throw new Error(result.error || "Failed to save image");
          setMediaImages((prev) => [...prev, result.media]);
        }
      }
      
      toast({ title: "Images added!", variant: "success" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setAddingImage(false);
      e.target.value = "";
    }
  };

  const deleteImage = async (mediaId: string) => {
    if (isNew || mediaId.startsWith("temp-")) {
      setMediaImages((prev) => prev.filter((m) => m.id !== mediaId));
      return;
    }
    try {
      const res = await fetch(`/api/admin/listings/${listing.id}/media`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaId }),
      });
      if (!res.ok) throw new Error("Failed to delete");
      setMediaImages((prev) => prev.filter((m) => m.id !== mediaId));
      toast({ title: "Image removed", variant: "success" });
    } catch (e: any) {
      toast({ title: "Failed to remove image", description: e.message, variant: "destructive" });
    }
  };

  const setFeaturedImage = async (mediaId: string) => {
    if (isNew || mediaId.startsWith("temp-")) {
      setMediaImages((prev) => prev.map((m) => ({ ...m, isFeatured: m.id === mediaId })));
      return;
    }
    try {
      const res = await fetch(`/api/admin/listings/${listing.id}/media`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaId }),
      });
      if (!res.ok) throw new Error("Failed to update");
      setMediaImages((prev) => prev.map((m) => ({ ...m, isFeatured: m.id === mediaId })));
    } catch (e: any) {
      toast({ title: "Failed to set featured image", description: e.message, variant: "destructive" });
    }
  };

  const onSubmit = async (data: FormData) => {
    setSaving(true);
    try {
      const payload = { ...data, amenityIds: selectedAmenities };

      // Determine if we need to create or update
      // Use listing.id if editing, or router-push to edit page after creation
      const url    = isNew ? "/api/admin/listings" : `/api/admin/listings/${listing.id}`;
      const method = isNew ? "POST" : "PATCH";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Save failed");

      // For new listings, attach any queued media images
      if (isNew && mediaImages.length > 0 && result.property?.id) {
        await Promise.all(
          mediaImages.map(async (img, i) => {
            const res2 = await fetch(`/api/admin/listings/${result.property.id}/media`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ url: img.url, type: "IMAGE", isFeatured: i === 0 }),
            });
            if (!res2.ok) {
              const r = await res2.json().catch(() => ({ error: "Image upload failed" }));
              throw new Error(r.error || "Failed to save an image");
            }
          })
        );
      }

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

      {/* Step 4 — Media / Images */}
      {step === 4 && (
        <div className="bg-card rounded-xl border border-border shadow-luxury p-6 space-y-5">
          <div>
            <h2 className="font-semibold text-foreground mb-1">Property Images</h2>
            <p className="text-xs text-muted-foreground mb-4">
              Select one or more images from your device. Images will be optimized automatically.
            </p>

            {/* File Input */}
            <div className="flex gap-2 relative">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileUpload}
                disabled={addingImage}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                title="Upload Images"
              />
              <div className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl py-6 hover:border-gold-500/50 transition-colors bg-muted/30">
                {addingImage ? (
                  <>
                    <Loader2 size={20} className="animate-spin text-gold-500" />
                    <span className="text-sm font-medium">Processing images...</span>
                  </>
                ) : (
                  <>
                    <ImageIcon size={20} className="text-muted-foreground" />
                    <span className="text-sm font-medium">Click or drag images to upload</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Image Gallery */}
          {mediaImages.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {mediaImages.map((img) => (
                <div key={img.id} className={cn(
                  "group relative rounded-xl overflow-hidden border-2 transition-all",
                  img.isFeatured ? "border-gold-500 shadow-luxury" : "border-border hover:border-gold-500/50"
                )}>
                  <div className="aspect-video bg-muted">
                    <img
                      src={img.url}
                      alt={img.altText || "Property image"}
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='60' viewBox='0 0 100 60'%3E%3Crect fill='%23ddd' width='100' height='60'/%3E%3Ctext fill='%23888' font-size='10' x='50' y='35' text-anchor='middle'%3ENo preview%3C/text%3E%3C/svg%3E"; }}
                    />
                  </div>
                  {img.isFeatured && (
                    <div className="absolute top-2 left-2 bg-gold-500 text-navy-900 text-2xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Star size={9} fill="currentColor" /> Featured
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    {!img.isFeatured && (
                      <button
                        type="button"
                        onClick={() => setFeaturedImage(img.id)}
                        title="Set as featured image"
                        className="p-2 bg-gold-500 text-navy-900 rounded-lg hover:bg-gold-400 transition-colors"
                      >
                        <Star size={14} fill="currentColor" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => deleteImage(img.id)}
                      title="Remove image"
                      className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="border-2 border-dashed border-border rounded-xl py-12 flex flex-col items-center gap-3 text-muted-foreground">
              <ImageIcon size={28} className="opacity-40" />
              <p className="text-sm">No images added yet</p>
              <p className="text-xs">Paste an image URL above and click Add</p>
            </div>
          )}

          {isNew && mediaImages.length > 0 && (
            <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
              ℹ️ Images will be saved when you complete and save the listing on the last step.
            </p>
          )}
        </div>
      )}

      {/* Step 5 — SEO & Publish */}
      {step === 5 && (
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
          {userRole === "SUPER_ADMIN" && agencies.length > 0 && (
            <div className="bg-card rounded-xl border border-border shadow-luxury p-6">
              <h2 className="font-semibold text-foreground mb-3">Assign Agency</h2>
              <select {...register("agencyId")} className="input-luxury text-sm">
                <option value="">No Agency (System)</option>
                {agencies.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <p className="text-2xs text-muted-foreground mt-2">
                Super Admins can override the default agency assignment.
              </p>
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
        </div>
      </div>
    </form>
  );
}
