import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { ClipboardList, User, FileText, Settings, LogIn, Trash2, Edit, Plus } from "lucide-react";

export const metadata: Metadata = { title: "Audit Log — Admin" };
export const dynamic = "force-dynamic";

const ACTION_ICONS: Record<string, typeof ClipboardList> = {
  LOGIN:              LogIn,
  LISTING_CREATED:    Plus,
  LISTING_UPDATED:    Edit,
  LISTING_DELETED:    Trash2,
  LISTING_DUPLICATED: FileText,
  INQUIRY_UPDATED:    Edit,
  INQUIRY_REPLIED:    FileText,
  USER_UPDATED:       User,
  SETTINGS_UPDATED:   Settings,
};

const ACTION_COLORS: Record<string, string> = {
  LOGIN:              "text-green-600 bg-green-50 dark:bg-green-950",
  LISTING_CREATED:    "text-blue-600 bg-blue-50 dark:bg-blue-950",
  LISTING_UPDATED:    "text-amber-600 bg-amber-50 dark:bg-amber-950",
  LISTING_DELETED:    "text-red-600 bg-red-50 dark:bg-red-950",
  LISTING_DUPLICATED: "text-purple-600 bg-purple-50 dark:bg-purple-950",
  INQUIRY_UPDATED:    "text-amber-600 bg-amber-50 dark:bg-amber-950",
  INQUIRY_REPLIED:    "text-blue-600 bg-blue-50 dark:bg-blue-950",
  USER_UPDATED:       "text-purple-600 bg-purple-50 dark:bg-purple-950",
  SETTINGS_UPDATED:   "text-gray-600 bg-gray-50 dark:bg-gray-900",
};

export default async function AdminAuditLogPage() {
  const session = await auth();
  if (!session?.user) return null;
  if (session.user.role !== "SUPER_ADMIN") redirect("/admin");

  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      user: { select: { id: true, name: true, photo: true, email: true } },
    },
  }).catch(() => []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-display-sm font-light text-foreground">
          Audit Log
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Full history of all admin actions — last {logs.length} entries.
        </p>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-luxury overflow-hidden">
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <ClipboardList size={36} className="text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">No audit log entries yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {logs.map((log) => {
              const Icon = ACTION_ICONS[log.action] ?? ClipboardList;
              const colorClass = ACTION_COLORS[log.action] ?? "text-gray-600 bg-gray-50";
              const label = log.action
                .replace(/_/g, " ")
                .toLowerCase()
                .replace(/\b\w/g, (c) => c.toUpperCase());

              return (
                <div key={log.id} className="flex items-start gap-4 px-5 py-4 hover:bg-muted/20 transition-colors">
                  {/* Icon */}
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${colorClass}`}>
                    <Icon size={15} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm text-foreground">
                        {log.user.name}
                      </span>
                      <span className="text-muted-foreground text-sm">·</span>
                      <span className="text-sm text-foreground">{label}</span>
                      {log.entityType && (
                        <>
                          <span className="text-muted-foreground text-sm">·</span>
                          <span className="text-xs text-muted-foreground">
                            {log.entityType}
                            {log.entityId ? ` #${log.entityId.slice(-8).toUpperCase()}` : ""}
                          </span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                      <span>{log.user.email}</span>
                      {log.ipAddress && (
                        <>
                          <span>·</span>
                          <span className="font-mono">{log.ipAddress}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Timestamp */}
                  <div className="text-xs text-muted-foreground shrink-0 text-right">
                    <div>{formatDate(log.createdAt, "relative")}</div>
                    <div className="mt-0.5 opacity-60">
                      {new Date(log.createdAt).toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
