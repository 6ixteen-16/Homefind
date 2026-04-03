"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard, Building2, MessageSquare, Users, Image,
  Settings, FileText, Star, HelpCircle, ClipboardList,
  ChevronLeft, ChevronRight, LogOut, BarChart3,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import type { Role } from "@/types";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
  roles?: Role[];
}

const NAV_ITEMS: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/listings", label: "Listings", icon: Building2, roles: ["SUPER_ADMIN", "ADMIN", "AGENT"] },
  { href: "/admin/inquiries", label: "Inquiries", icon: MessageSquare, roles: ["SUPER_ADMIN", "ADMIN", "AGENT"] },
  { href: "/admin/blog", label: "Blog Posts", icon: FileText, roles: ["SUPER_ADMIN", "ADMIN", "EDITOR"] },
  { href: "/admin/media", label: "Media Library", icon: Image, roles: ["SUPER_ADMIN", "ADMIN", "AGENT"] },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3, roles: ["SUPER_ADMIN", "ADMIN"] },
];

const SETTINGS_ITEMS: NavItem[] = [
  { href: "/admin/users", label: "User Management", icon: Users, roles: ["SUPER_ADMIN"] },
  { href: "/admin/team", label: "Team Members", icon: Star, roles: ["SUPER_ADMIN", "ADMIN"] },
  { href: "/admin/testimonials", label: "Testimonials", icon: Star, roles: ["SUPER_ADMIN", "ADMIN"] },
  { href: "/admin/faqs", label: "FAQs", icon: HelpCircle, roles: ["SUPER_ADMIN", "ADMIN"] },
  { href: "/admin/audit-log", label: "Audit Log", icon: ClipboardList, roles: ["SUPER_ADMIN"] },
  { href: "/admin/settings", label: "Site Settings", icon: Settings, roles: ["SUPER_ADMIN"] },
];

interface AdminSidebarProps {
  user: {
    name: string;
    email: string;
    role: Role;
    photo?: string | null;
  };
}

export function AdminSidebar({ user }: AdminSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  const canAccess = (item: NavItem) => {
    if (!item.roles) return true;
    return item.roles.includes(user.role);
  };

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  };

  return (
    <aside
      className={cn(
        "relative flex flex-col bg-navy-900 border-r border-white/10 transition-all duration-300 ease-in-out",
        collapsed ? "w-16" : "w-64"
      )}
      aria-label="Admin navigation"
    >
      {/* Logo */}
      <div className={cn(
        "flex items-center border-b border-white/10 h-16 px-4",
        collapsed ? "justify-center" : "justify-between"
      )}>
        {!collapsed && (
          <Link href="/admin" className="flex flex-col leading-none">
            <span className="font-display text-xl font-light text-cream-100">Prestige</span>
            <span className="text-gold-400 text-2xs tracking-[0.25em] uppercase font-semibold -mt-0.5">Admin</span>
          </Link>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="p-1.5 rounded-lg text-cream-400 hover:text-cream-100 hover:bg-white/10 transition-all"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 space-y-1 px-2">
        {/* Main nav */}
        <div className="space-y-0.5">
          {NAV_ITEMS.filter(canAccess).map((item) => (
            <SidebarItem
              key={item.href}
              item={item}
              active={isActive(item.href)}
              collapsed={collapsed}
            />
          ))}
        </div>

        {/* Divider */}
        <div className="h-px bg-white/10 mx-2 my-3" />

        {/* Settings nav */}
        {!collapsed && (
          <div className="px-3 mb-1">
            <span className="text-2xs text-cream-600 font-semibold tracking-widest uppercase">
              Settings
            </span>
          </div>
        )}
        <div className="space-y-0.5">
          {SETTINGS_ITEMS.filter(canAccess).map((item) => (
            <SidebarItem
              key={item.href}
              item={item}
              active={isActive(item.href)}
              collapsed={collapsed}
            />
          ))}
        </div>
      </nav>

      {/* User + Logout */}
      <div className="border-t border-white/10 p-3">
        {!collapsed ? (
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-gold-500/30 flex items-center justify-center text-sm font-semibold text-gold-400 shrink-0">
              {user.name[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-cream-200 truncate">{user.name}</div>
              <div className="text-2xs text-cream-500 capitalize truncate">{user.role.replace("_", " ").toLowerCase()}</div>
            </div>
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full bg-gold-500/30 flex items-center justify-center text-sm font-semibold text-gold-400 mx-auto mb-2">
            {user.name[0].toUpperCase()}
          </div>
        )}

        <button
          onClick={() => signOut({ callbackUrl: "/admin/login" })}
          className={cn(
            "flex items-center gap-2 w-full px-3 py-2 rounded-lg text-cream-400",
            "hover:text-red-400 hover:bg-white/5 transition-all text-xs",
            collapsed && "justify-center"
          )}
          aria-label="Sign out"
        >
          <LogOut size={14} />
          {!collapsed && <span>Sign out</span>}
        </button>

        {!collapsed && (
          <Link
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-cream-500 hover:text-gold-400 hover:bg-white/5 transition-all text-xs mt-0.5"
          >
            <Building2 size={14} />
            View Live Site
          </Link>
        )}
      </div>
    </aside>
  );
}

function SidebarItem({
  item, active, collapsed,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      className={cn(
        "admin-sidebar-item",
        active ? "active" : "text-cream-400",
        collapsed && "justify-center px-0 py-3"
      )}
      aria-current={active ? "page" : undefined}
    >
      <Icon size={16} className={cn(active ? "text-gold-400" : "", "shrink-0")} />
      {!collapsed && (
        <span className="flex-1 truncate">{item.label}</span>
      )}
      {!collapsed && item.badge && item.badge > 0 && (
        <span className="bg-red-500 text-white text-2xs font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
          {item.badge > 99 ? "99+" : item.badge}
        </span>
      )}
    </Link>
  );
}
