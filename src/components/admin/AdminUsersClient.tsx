"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, UserCheck, UserX, ChevronDown } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { toast } from "@/components/ui/toaster";

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300",
  ADMIN:       "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300",
  AGENT:       "bg-gold-500/10 text-amber-700 border-amber-200 dark:text-amber-300",
  EDITOR:      "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300",
  VIEWER:      "bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-900 dark:text-gray-400",
};

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  photo: string | null;
  _count: { listings: number; assignedInquiries: number };
}

interface AdminUsersClientProps {
  users: UserRow[];
  currentUserId: string;
}

export function AdminUsersClient({ users, currentUserId }: AdminUsersClientProps) {
  const router = useRouter();
  const [updating, setUpdating] = useState<string | null>(null);

  const updateUser = async (id: string, data: Record<string, unknown>) => {
    setUpdating(id);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error();
      toast({ title: "User updated", variant: "success" });
      router.refresh();
    } catch {
      toast({ title: "Failed to update user", variant: "destructive" });
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="bg-card rounded-xl border border-border shadow-luxury overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm" role="table" aria-label="User management">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="text-left px-5 py-3 font-semibold text-foreground">User</th>
              <th className="text-left px-4 py-3 font-semibold text-foreground hidden md:table-cell">Role</th>
              <th className="text-left px-4 py-3 font-semibold text-foreground hidden lg:table-cell">Activity</th>
              <th className="text-left px-4 py-3 font-semibold text-foreground hidden xl:table-cell">Last Login</th>
              <th className="text-left px-4 py-3 font-semibold text-foreground">Status</th>
              <th className="px-4 py-3 font-semibold text-foreground text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    {user.photo ? (
                      <Image
                        src={user.photo}
                        alt={user.name}
                        width={36}
                        height={36}
                        className="rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-gold-500/20 flex items-center justify-center text-sm font-semibold text-gold-600 shrink-0">
                        {user.name[0].toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="font-medium text-foreground truncate flex items-center gap-1.5">
                        {user.name}
                        {user.id === currentUserId && (
                          <span className="text-2xs text-muted-foreground">(you)</span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                    </div>
                  </div>
                </td>

                <td className="px-4 py-3 hidden md:table-cell">
                  <span className={cn("text-xs px-2.5 py-1 rounded-full border font-medium", ROLE_COLORS[user.role] || ROLE_COLORS.VIEWER)}>
                    {user.role.replace("_", " ")}
                  </span>
                </td>

                <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground text-xs">
                  <div>{user._count.listings} listing{user._count.listings !== 1 ? "s" : ""}</div>
                  <div>{user._count.assignedInquiries} inquir{user._count.assignedInquiries !== 1 ? "ies" : "y"}</div>
                </td>

                <td className="px-4 py-3 hidden xl:table-cell text-xs text-muted-foreground">
                  {user.lastLoginAt ? formatDate(user.lastLoginAt, "relative") : "Never"}
                </td>

                <td className="px-4 py-3">
                  <span className={cn(
                    "text-xs px-2 py-0.5 rounded-full font-medium",
                    user.isActive
                      ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400"
                      : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400"
                  )}>
                    {user.isActive ? "Active" : "Suspended"}
                  </span>
                </td>

                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    {/* Role change */}
                    {user.id !== currentUserId && (
                      <select
                        defaultValue={user.role}
                        disabled={updating === user.id}
                        onChange={(e) => updateUser(user.id, { role: e.target.value })}
                        aria-label={`Change role for ${user.name}`}
                        className="text-xs bg-background border border-border rounded-lg px-2 py-1 text-foreground focus:outline-none focus:border-gold-500 transition-colors disabled:opacity-50"
                      >
                        {["SUPER_ADMIN", "ADMIN", "AGENT", "EDITOR", "VIEWER"].map((r) => (
                          <option key={r} value={r}>{r.replace("_", " ")}</option>
                        ))}
                      </select>
                    )}

                    {/* Suspend / Activate */}
                    {user.id !== currentUserId && (
                      <button
                        onClick={() => updateUser(user.id, { isActive: !user.isActive })}
                        disabled={updating === user.id}
                        aria-label={user.isActive ? "Suspend user" : "Activate user"}
                        className={cn(
                          "p-1.5 rounded-lg transition-colors disabled:opacity-50",
                          user.isActive
                            ? "text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
                            : "text-muted-foreground hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-950"
                        )}
                      >
                        {user.isActive ? <UserX size={15} /> : <UserCheck size={15} />}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
