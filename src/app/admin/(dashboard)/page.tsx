import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Building2, MessageSquare, Eye, TrendingUp, Users, Clock, Plus, ArrowRight } from "lucide-react";
import Link from "next/link";
import { formatDate, formatNumber } from "@/lib/utils";
import { getInquiryStatusConfig } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard — Admin" };

export const dynamic = "force-dynamic";

async function getDashboardStats(userId: string, role: string) {
  const isAgentOnly = role === "AGENT";
  const agentFilter = isAgentOnly ? { agentId: userId } : {};

  const [
    totalListings,
    activeListings,
    newInquiries,
    totalInquiries,
    topListings,
    recentInquiries,
    recentAuditLogs,
  ] = await Promise.all([
    prisma.property.count({ where: { ...agentFilter, deletedAt: null } }),
    prisma.property.count({ where: { ...agentFilter, status: "PUBLISHED", deletedAt: null } }),
    prisma.inquiry.count({
      where: { status: "NEW", ...(isAgentOnly ? { assignedToId: userId } : {}) },
    }),
    prisma.inquiry.count({
      where: isAgentOnly ? { assignedToId: userId } : {},
    }),
    prisma.property.findMany({
      where: { ...agentFilter, status: "PUBLISHED", deletedAt: null },
      orderBy: { views: "desc" },
      take: 5,
      select: { id: true, slug: true, title: true, views: true, createdAt: true },
    }),
    prisma.inquiry.findMany({
      where: isAgentOnly ? { assignedToId: userId } : {},
      orderBy: { createdAt: "desc" },
      take: 8,
      include: {
        property: { select: { title: true, slug: true } },
        assignedTo: { select: { name: true } },
      },
    }),
    !isAgentOnly
      ? prisma.auditLog.findMany({
          orderBy: { createdAt: "desc" },
          take: 10,
          include: { user: { select: { name: true, photo: true } } },
        })
      : Promise.resolve([]),
  ]);

  return {
    totalListings,
    activeListings,
    newInquiries,
    totalInquiries,
    topListings,
    recentInquiries,
    recentAuditLogs,
  };
}

export default async function AdminDashboardPage() {
  const session = await auth();
  if (!session?.user) return null;

  const stats = await getDashboardStats(session.user.id, session.user.role);
  const isAgent = session.user.role === "AGENT";

  const statCards = [
    {
      label: "Total Listings",
      value: formatNumber(stats.totalListings),
      sub: `${stats.activeListings} active`,
      icon: Building2,
      color: "text-blue-600",
      bg: "bg-blue-50 dark:bg-blue-950/30",
      href: "/admin/listings",
    },
    {
      label: "New Inquiries",
      value: formatNumber(stats.newInquiries),
      sub: `${stats.totalInquiries} total`,
      icon: MessageSquare,
      color: "text-amber-600",
      bg: "bg-amber-50 dark:bg-amber-950/30",
      href: "/admin/inquiries",
    },
    {
      label: "Total Views",
      value: formatNumber(stats.topListings.reduce((s, p) => s + p.views, 0)),
      sub: "across top listings",
      icon: Eye,
      color: "text-green-600",
      bg: "bg-green-50 dark:bg-green-950/30",
      href: "/admin/listings",
    },
    {
      label: "Active Listings",
      value: formatNumber(stats.activeListings),
      sub: `of ${stats.totalListings} total`,
      icon: TrendingUp,
      color: "text-purple-600",
      bg: "bg-purple-50 dark:bg-purple-950/30",
      href: "/admin/listings?status=PUBLISHED",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-display-sm font-light text-foreground">
            Welcome back, {session.user.name.split(" ")[0]}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Here&apos;s what&apos;s happening with your properties today.
          </p>
        </div>
        {!isAgent && (
          <Link href="/admin/listings/new" className="btn-gold">
            <Plus size={16} />
            New Listing
          </Link>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.label}
              href={card.href}
              className="bg-card rounded-xl border border-border p-5 shadow-luxury hover:shadow-luxury-lg transition-all duration-300 hover:-translate-y-0.5 group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg ${card.bg} flex items-center justify-center`}>
                  <Icon size={20} className={card.color} />
                </div>
                <ArrowRight
                  size={16}
                  className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                />
              </div>
              <div className="font-display text-3xl font-light text-foreground mb-0.5">
                {card.value}
              </div>
              <div className="text-sm font-medium text-foreground">{card.label}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{card.sub}</div>
            </Link>
          );
        })}
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Recent Inquiries */}
        <div className="bg-card rounded-xl border border-border shadow-luxury">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="font-semibold text-foreground">Recent Inquiries</h2>
            <Link
              href="/admin/inquiries"
              className="text-xs text-gold-600 hover:text-gold-700 font-medium transition-colors"
            >
              View all →
            </Link>
          </div>
          <div className="divide-y divide-border">
            {stats.recentInquiries.length === 0 ? (
              <div className="px-5 py-8 text-center text-muted-foreground text-sm">
                No inquiries yet
              </div>
            ) : (
              stats.recentInquiries.map((inquiry) => {
                const statusConfig = getInquiryStatusConfig(inquiry.status);
                return (
                  <Link
                    key={inquiry.id}
                    href={`/admin/inquiries/${inquiry.id}`}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-muted/40 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-gold-500/20 flex items-center justify-center text-sm font-semibold text-gold-600 shrink-0">
                      {inquiry.name[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">{inquiry.name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {inquiry.property?.title || "General Inquiry"}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={`text-2xs px-2 py-0.5 rounded-full font-medium border ${statusConfig.className}`}>
                        {statusConfig.label}
                      </span>
                      <span className="text-2xs text-muted-foreground">
                        {formatDate(inquiry.createdAt, "relative")}
                      </span>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>

        {/* Top Listings / Audit Log */}
        <div className="space-y-6">
          {/* Top Viewed */}
          <div className="bg-card rounded-xl border border-border shadow-luxury">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="font-semibold text-foreground">Top Viewed Listings</h2>
              <Link
                href="/admin/listings"
                className="text-xs text-gold-600 hover:text-gold-700 font-medium transition-colors"
              >
                View all →
              </Link>
            </div>
            <div className="divide-y divide-border">
              {stats.topListings.length === 0 ? (
                <div className="px-5 py-8 text-center text-muted-foreground text-sm">
                  No listings yet
                </div>
              ) : (
                stats.topListings.map((listing, i) => (
                  <div key={listing.id} className="flex items-center gap-3 px-5 py-3">
                    <span className="text-sm font-mono text-muted-foreground/50 w-4">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/admin/listings/${listing.id}`}
                        className="text-sm font-medium text-foreground hover:text-gold-600 transition-colors truncate block"
                      >
                        {listing.title}
                      </Link>
                      <div className="text-xs text-muted-foreground">
                        Listed {formatDate(listing.createdAt, "relative")}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground shrink-0">
                      <Eye size={13} />
                      {formatNumber(listing.views)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Audit Log */}
          {!isAgent && stats.recentAuditLogs.length > 0 && (
            <div className="bg-card rounded-xl border border-border shadow-luxury">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <h2 className="font-semibold text-foreground">Recent Activity</h2>
                <Link
                  href="/admin/audit-log"
                  className="text-xs text-gold-600 hover:text-gold-700 font-medium"
                >
                  Full log →
                </Link>
              </div>
              <div className="divide-y divide-border">
                {stats.recentAuditLogs.slice(0, 5).map((log) => (
                  <div key={log.id} className="flex items-start gap-3 px-5 py-3">
                    <Clock size={14} className="text-muted-foreground shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-foreground">
                        <span className="font-medium">{log.user.name}</span>
                        {" "}
                        <span className="text-muted-foreground">{log.action.toLowerCase().replace("_", " ")}</span>
                        {" "}
                        <span className="font-medium">{log.entityType}</span>
                      </div>
                      <div className="text-2xs text-muted-foreground mt-0.5">
                        {formatDate(log.createdAt, "relative")}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
