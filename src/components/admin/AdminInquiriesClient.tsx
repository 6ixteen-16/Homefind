"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Search, Filter, MessageSquare, Clock, CheckCircle, XCircle, AlertCircle, Inbox } from "lucide-react";
import { cn, formatDate, getInquiryStatusConfig } from "@/lib/utils";
import { toast } from "@/components/ui/toaster";
import type { PaginationMeta, Role } from "@/types";

interface InquiryRow {
  id: string;
  type: string;
  name: string;
  email: string;
  phone?: string | null;
  message: string;
  status: string;
  createdAt: Date;
  property?: { id: string; slug: string; title: string } | null;
  assignedTo?: { id: string; name: string } | null;
  _count: { notes: number; replies: number };
}

interface AdminInquiriesClientProps {
  inquiries: InquiryRow[];
  statusCounts: Record<string, number>;
  meta: PaginationMeta;
  searchParams: Record<string, string | undefined>;
  userRole: Role;
  currentUserId: string;
}

const STATUS_TABS = [
  { value: "", label: "All", icon: Inbox },
  { value: "NEW", label: "New", icon: AlertCircle },
  { value: "IN_PROGRESS", label: "In Progress", icon: Clock },
  { value: "AWAITING_CLIENT", label: "Awaiting", icon: MessageSquare },
  { value: "CLOSED_WON", label: "Won", icon: CheckCircle },
  { value: "CLOSED_LOST", label: "Lost", icon: XCircle },
];

export function AdminInquiriesClient({
  inquiries, statusCounts, meta, searchParams, userRole, currentUserId,
}: AdminInquiriesClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const urlParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.search ?? "");

  const totalAll = Object.values(statusCounts).reduce((a, b) => a + b, 0);

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

  const updateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/admin/inquiries/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      toast({ title: "Status updated", variant: "success" });
      router.refresh();
    } catch {
      toast({ title: "Failed to update status", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-5">
      {/* Status tabs */}
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1">
        {STATUS_TABS.map(({ value, label, icon: Icon }) => {
          const count = value === "" ? totalAll : (statusCounts[value] ?? 0);
          const active = (searchParams.status ?? "") === value;
          return (
            <button
              key={value}
              onClick={() => updateParams({ status: value || undefined })}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all shrink-0",
                active
                  ? "bg-navy-900 text-cream-100 shadow-luxury"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <Icon size={14} />
              {label}
              {count > 0 && (
                <span className={cn(
                  "text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center font-semibold",
                  active ? "bg-white/20 text-cream-100" : "bg-muted text-foreground"
                )}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <form onSubmit={handleSearch} className="relative flex-1 min-w-0 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, message..."
            className="input-luxury pl-9 text-sm py-2"
          />
        </form>
        <select
          value={searchParams.type ?? ""}
          onChange={(e) => updateParams({ type: e.target.value || undefined })}
          className="input-luxury text-sm py-2 w-36"
          aria-label="Filter by type"
        >
          <option value="">All Types</option>
          <option value="PROPERTY">Property</option>
          <option value="GENERAL">General</option>
          <option value="VIEWING">Viewing</option>
        </select>
      </div>

      {/* Inquiry List */}
      <div className="bg-card rounded-xl border border-border shadow-luxury overflow-hidden">
        {inquiries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Inbox size={36} className="text-muted-foreground/50 mb-3" />
            <h3 className="font-medium text-foreground mb-1">No inquiries found</h3>
            <p className="text-sm text-muted-foreground">Try adjusting your filters or search terms.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {inquiries.map((inquiry) => {
              const statusConfig = getInquiryStatusConfig(inquiry.status);
              return (
                <div key={inquiry.id} className="flex items-start gap-4 p-4 hover:bg-muted/30 transition-colors group">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-gold-500/15 flex items-center justify-center text-sm font-semibold text-gold-600 shrink-0">
                    {inquiry.name[0].toUpperCase()}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
                            href={`/admin/inquiries/${inquiry.id}`}
                            className="font-semibold text-foreground hover:text-gold-600 transition-colors"
                          >
                            {inquiry.name}
                          </Link>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${statusConfig.className}`}>
                            {statusConfig.label}
                          </span>
                          {inquiry.type !== "PROPERTY" && (
                            <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full capitalize">
                              {inquiry.type.toLowerCase()}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                          <a href={`mailto:${inquiry.email}`} className="hover:text-foreground transition-colors">
                            {inquiry.email}
                          </a>
                          {inquiry.phone && <span>· {inquiry.phone}</span>}
                        </div>
                        {inquiry.property && (
                          <div className="text-xs text-gold-600 mt-0.5">
                            Re: {inquiry.property.title}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {inquiry._count.replies > 0 && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MessageSquare size={11} /> {inquiry._count.replies}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {formatDate(inquiry.createdAt, "relative")}
                        </span>
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground mt-1.5 line-clamp-2">{inquiry.message}</p>

                    {/* Quick status change */}
                    <div className="flex items-center gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link
                        href={`/admin/inquiries/${inquiry.id}`}
                        className="text-xs text-gold-600 hover:text-gold-700 font-medium transition-colors"
                      >
                        View & Reply →
                      </Link>
                      <span className="text-muted-foreground text-xs">·</span>
                      <span className="text-xs text-muted-foreground">Move to:</span>
                      {["IN_PROGRESS", "CLOSED_WON", "CLOSED_LOST"].map((s) => {
                        if (s === inquiry.status) return null;
                        const cfg = getInquiryStatusConfig(s);
                        return (
                          <button
                            key={s}
                            onClick={() => updateStatus(inquiry.id, s)}
                            className={`text-xs px-2 py-0.5 rounded-full border transition-colors hover:opacity-80 ${cfg.className}`}
                          >
                            {cfg.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <span className="text-sm text-muted-foreground">
              {meta.total} total inquiries
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => updateParams({ page: String(meta.page - 1) })}
                disabled={!meta.hasPrevPage}
                className="px-3 py-1.5 text-sm border border-border rounded-lg disabled:opacity-40 hover:bg-muted transition-colors"
              >
                ← Prev
              </button>
              <span className="text-sm">{meta.page} / {meta.totalPages}</span>
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
    </div>
  );
}
