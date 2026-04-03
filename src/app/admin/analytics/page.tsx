import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatNumber, formatDate } from "@/lib/utils";
import { TrendingUp, Eye, MessageSquare, Building2 } from "lucide-react";

export const metadata: Metadata = { title: "Analytics — Admin" };
export const dynamic = "force-dynamic";

export default async function AdminAnalyticsPage() {
  const session = await auth();
  if (!session?.user) return null;

  const isAgent = session.user.role === "AGENT";
  const agentFilter = isAgent ? { agentId: session.user.id } : {};

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo  = new Date(Date.now() -  7 * 24 * 60 * 60 * 1000);

  const [
    totalViews,
    topListings,
    inquiryLast30,
    inquiryLast7,
    totalPublished,
    recentInquiries,
  ] = await Promise.all([
    prisma.property.aggregate({
      where: { ...agentFilter, deletedAt: null },
      _sum: { views: true },
    }),
    prisma.property.findMany({
      where: { ...agentFilter, status: "PUBLISHED", deletedAt: null },
      orderBy: { views: "desc" },
      take: 10,
      select: { id: true, slug: true, title: true, views: true, createdAt: true, city: true },
    }),
    prisma.inquiry.count({
      where: {
        ...(isAgent ? { assignedToId: session.user.id } : {}),
        createdAt: { gte: thirtyDaysAgo },
      },
    }),
    prisma.inquiry.count({
      where: {
        ...(isAgent ? { assignedToId: session.user.id } : {}),
        createdAt: { gte: sevenDaysAgo },
      },
    }),
    prisma.property.count({ where: { ...agentFilter, status: "PUBLISHED", deletedAt: null } }),
    prisma.inquiry.findMany({
      where: isAgent ? { assignedToId: session.user.id } : {},
      orderBy: { createdAt: "desc" },
      take: 30,
      select: { id: true, createdAt: true, status: true, name: true },
    }),
  ]).catch(() => [
    { _sum: { views: null } }, [], 0, 0, 0, [],
  ] as const);

  const summaryCards = [
    {
      label: "Total Listing Views",
      value: formatNumber((totalViews as any)?._sum?.views ?? 0),
      sub: "all time",
      icon: Eye,
      color: "text-blue-500",
      bg: "bg-blue-50 dark:bg-blue-950/30",
    },
    {
      label: "Inquiries (30 days)",
      value: formatNumber(inquiryLast30 as number),
      sub: `${formatNumber(inquiryLast7 as number)} in last 7 days`,
      icon: MessageSquare,
      color: "text-gold-600",
      bg: "bg-gold-500/10",
    },
    {
      label: "Published Listings",
      value: formatNumber(totalPublished as number),
      sub: "currently live",
      icon: Building2,
      color: "text-green-600",
      bg: "bg-green-50 dark:bg-green-950/30",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-display-sm font-light text-foreground">
          Analytics
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Internal performance metrics pulled from your database.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid sm:grid-cols-3 gap-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-card rounded-xl border border-border p-5 shadow-luxury">
              <div className={`w-10 h-10 rounded-lg ${card.bg} flex items-center justify-center mb-3`}>
                <Icon size={20} className={card.color} />
              </div>
              <div className="font-display text-3xl font-light text-foreground mb-0.5">
                {card.value}
              </div>
              <div className="text-sm font-medium text-foreground">{card.label}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{card.sub}</div>
            </div>
          );
        })}
      </div>

      {/* Top Listings Table */}
      <div className="bg-card rounded-xl border border-border shadow-luxury">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <TrendingUp size={16} className="text-gold-500" />
            Top Viewed Listings
          </h2>
        </div>
        <div className="divide-y divide-border">
          {(topListings as any[]).length === 0 ? (
            <div className="px-5 py-10 text-center text-muted-foreground text-sm">
              No published listings yet.
            </div>
          ) : (
            (topListings as any[]).map((listing, i) => (
              <div key={listing.id} className="flex items-center gap-4 px-5 py-3 hover:bg-muted/30 transition-colors">
                <span className="text-sm font-mono text-muted-foreground/50 w-6 text-center">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-foreground text-sm truncate">
                    {listing.title}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {listing.city} · Listed {formatDate(listing.createdAt, "relative")}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Eye size={13} className="text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">
                    {formatNumber(listing.views)}
                  </span>
                  <span className="text-xs text-muted-foreground">views</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Inquiry trend notice */}
      <div className="bg-gold-500/5 border border-gold-500/20 rounded-xl p-5">
        <p className="text-sm text-foreground">
          <strong>Tip:</strong> For detailed visitor analytics (sessions, traffic sources,
          conversions), connect{" "}
          <a
            href="https://analytics.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gold-600 hover:underline"
          >
            Google Analytics 4
          </a>{" "}
          by adding your <code className="bg-muted px-1.5 py-0.5 rounded text-xs">NEXT_PUBLIC_GA4_ID</code>{" "}
          environment variable in Vercel.
        </p>
      </div>
    </div>
  );
}
