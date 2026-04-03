"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Search, Filter, Trash2, Eye, Pencil, Copy, ChevronDown, Download, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn, formatPrice, formatDate, getListingTypeBadge, getStatusLabel } from "@/lib/utils";
import { toast } from "@/components/ui/toaster";
import type { PaginationMeta, Role } from "@/types";

interface ListingRow {
  id: string;
  slug: string;
  title: string;
  listingType: string;
  category: string;
  propertyType: string;
  status: string;
  price: number;
  currency: string;
  city: string;
  isFeatured: boolean;
  views: number;
  createdAt: Date;
  updatedAt: Date;
  featuredImage: string | null;
  agent: { id: string; name: string } | null;
}

interface AdminListingsClientProps {
  listings: ListingRow[];
  agents: { id: string; name: string }[];
  meta: PaginationMeta;
  searchParams: Record<string, string | undefined>;
  currentUserId: string;
  userRole: Role;
}

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "PUBLISHED", label: "Published" },
  { value: "DRAFT", label: "Draft" },
  { value: "UNDER_OFFER", label: "Under Offer" },
  { value: "SOLD", label: "Sold" },
  { value: "ARCHIVED", label: "Archived" },
];

export function AdminListingsClient({
  listings, agents, meta, searchParams, currentUserId, userRole,
}: AdminListingsClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const urlParams = useSearchParams();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState(searchParams.search ?? "");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const isAdmin = ["SUPER_ADMIN", "ADMIN"].includes(userRole);

  const updateParams = (updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams(urlParams.toString());
    Object.entries(updates).forEach(([k, v]) => {
      if (v) params.set(k, v); else params.delete(k);
    });
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateParams({ search: search || undefined });
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/listings/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permanent: false }),
      });
      if (!res.ok) throw new Error("Delete failed");
      toast({ title: "Listing archived", variant: "success" });
      router.refresh();
    } catch {
      toast({ title: "Failed to delete listing", variant: "destructive" });
    } finally {
      setDeleteConfirm(null);
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/listings/${id}/duplicate`, { method: "POST" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      toast({ title: "Listing duplicated", description: "New draft created.", variant: "success" });
      router.push(`/admin/listings/${data.property.id}`);
    } catch {
      toast({ title: "Failed to duplicate", variant: "destructive" });
    }
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelected(selected.size === listings.length ? new Set() : new Set(listings.map((l) => l.id)));
  };

  return (
    <div className="space-y-4">
      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <form onSubmit={handleSearch} className="relative flex-1 min-w-0 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search listings..."
            className="input-luxury pl-9 text-sm py-2"
          />
        </form>

        <select
          value={searchParams.status ?? ""}
          onChange={(e) => updateParams({ status: e.target.value || undefined })}
          className="input-luxury text-sm py-2 w-40"
          aria-label="Filter by status"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <select
          value={searchParams.listingType ?? ""}
          onChange={(e) => updateParams({ listingType: e.target.value || undefined })}
          className="input-luxury text-sm py-2 w-36"
          aria-label="Filter by type"
        >
          <option value="">All Types</option>
          <option value="SALE">For Sale</option>
          <option value="RENT">For Rent</option>
        </select>

        {isAdmin && agents.length > 0 && (
          <select
            value={searchParams.agentId ?? ""}
            onChange={(e) => updateParams({ agentId: e.target.value || undefined })}
            className="input-luxury text-sm py-2 w-40"
            aria-label="Filter by agent"
          >
            <option value="">All Agents</option>
            {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        )}
      </div>

      {/* Bulk Actions */}
      {selected.size > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-3 bg-navy-900/5 dark:bg-white/5 rounded-xl border border-gold-500/20"
        >
          <span className="text-sm font-medium">{selected.size} selected</span>
          <button onClick={selectAll} className="text-xs text-muted-foreground hover:text-foreground ml-1">
            <X size={14} />
          </button>
          <div className="h-4 w-px bg-border" />
          {isAdmin && (
            <button
              onClick={async () => {
                if (!confirm(`Delete ${selected.size} listings?`)) return;
                await Promise.all([...selected].map((id) => handleDelete(id)));
                setSelected(new Set());
              }}
              className="flex items-center gap-1.5 text-sm text-red-600 hover:text-red-700 transition-colors"
            >
              <Trash2 size={14} /> Delete selected
            </button>
          )}
        </motion.div>
      )}

      {/* Table */}
      <div className="bg-card rounded-xl border border-border shadow-luxury overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" role="table" aria-label="Property listings">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selected.size === listings.length && listings.length > 0}
                    onChange={selectAll}
                    aria-label="Select all listings"
                    className="accent-gold-500"
                  />
                </th>
                <th className="text-left px-4 py-3 font-semibold text-foreground">Property</th>
                <th className="text-left px-4 py-3 font-semibold text-foreground hidden md:table-cell">Type</th>
                <th className="text-left px-4 py-3 font-semibold text-foreground">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-foreground hidden lg:table-cell">Price</th>
                <th className="text-left px-4 py-3 font-semibold text-foreground hidden xl:table-cell">Agent</th>
                <th className="text-left px-4 py-3 font-semibold text-foreground hidden xl:table-cell">Views</th>
                <th className="text-left px-4 py-3 font-semibold text-foreground hidden lg:table-cell">Created</th>
                <th className="px-4 py-3 font-semibold text-foreground text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {listings.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-16 text-muted-foreground">
                    No listings found. Try adjusting your filters.
                  </td>
                </tr>
              ) : (
                listings.map((listing) => {
                  const badge = getListingTypeBadge(listing.listingType as any);
                  const statusConfig = getStatusLabel(listing.status);
                  return (
                    <tr key={listing.id} className={cn("hover:bg-muted/30 transition-colors", selected.has(listing.id) && "bg-gold-500/5")}>
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selected.has(listing.id)}
                          onChange={() => toggleSelect(listing.id)}
                          aria-label={`Select ${listing.title}`}
                          className="accent-gold-500"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="relative w-14 h-10 rounded-lg overflow-hidden bg-muted shrink-0">
                            {listing.featuredImage ? (
                              <Image src={listing.featuredImage} alt="" fill className="object-cover" />
                            ) : (
                              <div className="absolute inset-0 bg-gradient-luxury" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-foreground truncate max-w-[200px]">{listing.title}</div>
                            <div className="text-xs text-muted-foreground">{listing.city}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className={badge.className + " text-xs"}>{badge.label}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", statusConfig.className)}>
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-foreground font-medium">
                        {formatPrice(listing.price, listing.currency, true)}
                      </td>
                      <td className="px-4 py-3 hidden xl:table-cell text-muted-foreground">
                        {listing.agent?.name ?? "—"}
                      </td>
                      <td className="px-4 py-3 hidden xl:table-cell text-muted-foreground">
                        {listing.views.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">
                        {formatDate(listing.createdAt, "short")}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/properties/${listing.slug}`}
                            target="_blank"
                            aria-label="Preview listing"
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          >
                            <Eye size={15} />
                          </Link>
                          <Link
                            href={`/admin/listings/${listing.id}`}
                            aria-label="Edit listing"
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-gold-600 hover:bg-gold-500/10 transition-colors"
                          >
                            <Pencil size={15} />
                          </Link>
                          {isAdmin && (
                            <>
                              <button
                                onClick={() => handleDuplicate(listing.id)}
                                aria-label="Duplicate listing"
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                              >
                                <Copy size={15} />
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(listing.id)}
                                aria-label="Delete listing"
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                              >
                                <Trash2 size={15} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <span className="text-sm text-muted-foreground">
              Showing {((meta.page - 1) * meta.pageSize) + 1}–{Math.min(meta.page * meta.pageSize, meta.total)} of {meta.total}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => updateParams({ page: String(meta.page - 1) })}
                disabled={!meta.hasPrevPage}
                className="px-3 py-1.5 text-sm border border-border rounded-lg disabled:opacity-40 hover:bg-muted transition-colors"
              >
                ← Prev
              </button>
              <span className="text-sm text-foreground font-medium px-2">{meta.page} / {meta.totalPages}</span>
              <button
                onClick={() => updateParams({ page: String(meta.page + 1) })}
                disabled={!meta.hasNextPage}
                className="px-3 py-1.5 text-sm border border-border rounded-lg disabled:opacity-40 hover:bg-muted transition-colors"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setDeleteConfirm(null)}
              className="fixed inset-0 bg-black/50 z-40"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-card rounded-2xl border border-border shadow-luxury-xl p-6 w-full max-w-sm"
            >
              <h3 className="font-semibold text-foreground mb-2">Archive Listing?</h3>
              <p className="text-sm text-muted-foreground mb-6">
                This listing will be moved to the archive. It can be recovered within 30 days.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteConfirm(null)}
                  className="flex-1 py-2.5 border border-border rounded-lg text-sm hover:bg-muted transition-colors">
                  Cancel
                </button>
                <button onClick={() => handleDelete(deleteConfirm)}
                  className="flex-1 py-2.5 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors font-medium">
                  Archive
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
