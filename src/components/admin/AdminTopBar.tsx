"use client";

import { Bell, Search, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { useState, useEffect } from "react";
import Image from "next/image";
import type { Role } from "@/types";

interface AdminTopBarProps {
  user: {
    name: string;
    email: string;
    role: Role;
    photo?: string | null;
  };
}

export function AdminTopBar({ user }: AdminTopBarProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const roleLabel = user.role.replace("_", " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <header className="h-16 border-b border-border bg-card flex items-center px-6 gap-4 shrink-0">
      {/* Search */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search listings, inquiries..."
            className="w-full bg-muted border-none rounded-lg pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold-500/30 transition-all"
            aria-label="Search admin"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 ml-auto">
        {/* Theme toggle */}
        {mounted && (
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label="Toggle theme"
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        )}

        {/* Notifications */}
        <button
          aria-label="Notifications"
          className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" aria-hidden="true" />
        </button>

        {/* Divider */}
        <div className="h-6 w-px bg-border" />

        {/* User */}
        <div className="flex items-center gap-2.5 pl-1">
          {user.photo ? (
            <Image
              src={user.photo}
              alt={user.name}
              width={32}
              height={32}
              className="rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gold-500/20 flex items-center justify-center text-sm font-semibold text-gold-600">
              {user.name[0].toUpperCase()}
            </div>
          )}
          <div className="hidden sm:block">
            <div className="text-sm font-medium text-foreground leading-none">{user.name}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{roleLabel}</div>
          </div>
        </div>
      </div>
    </header>
  );
}
