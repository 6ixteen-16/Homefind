"use client";

import { useState } from "react";
import { Plus, Check, X, Edit, Trash2 } from "lucide-react";
import { cn, formatPrice } from "@/lib/utils";

export function AdminPackagesClient({ packages: initialPackages }: { packages: any[] }) {
  const [packages, setPackages] = useState(initialPackages);

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button className="btn-primary">
          <Plus size={16} />
          Create Package
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {packages.map((pkg) => (
          <div key={pkg.id} className={cn(
            "card relative flex flex-col",
            pkg.isPopular && "ring-2 ring-gold-500"
          )}>
            {pkg.isPopular && (
              <div className="absolute -top-3 inset-x-0 flex justify-center">
                <span className="bg-gold-500 text-navy-900 text-2xs font-bold uppercase tracking-widest px-3 py-1 rounded-full">
                  Most Popular
                </span>
              </div>
            )}
            
            <div className="p-6 flex-1">
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-display text-xl">{pkg.name}</h3>
                {!pkg.isActive && (
                  <span className="badge-status text-red-700 bg-red-100 dark:bg-red-900/30 dark:text-red-400">
                    Inactive
                  </span>
                )}
              </div>
              
              <div className="mb-4">
                <span className="text-3xl font-light text-navy-900 dark:text-cream-100">
                  {formatPrice(pkg.price, pkg.currency)}
                </span>
                <span className="text-muted-foreground"> / {pkg.durationDays} days</span>
              </div>
              
              <p className="text-sm text-muted-foreground mb-6">
                {pkg.description || "No description provided."}
              </p>
              
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <Check size={16} className="text-green-500" />
                  <span>
                    {pkg.listingLimit === -1 ? "Unlimited" : pkg.listingLimit} Listings limit
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Check size={16} className="text-green-500" />
                  <span>{pkg._count?.agencies || 0} active agencies</span>
                </div>
              </div>
            </div>
            
            <div className="border-t border-border p-4 flex justify-between bg-muted/30">
              <button className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium flex items-center gap-1">
                <Edit size={14} /> Edit
              </button>
              <button className="text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 font-medium flex items-center gap-1">
                <Trash2 size={14} /> Delete
              </button>
            </div>
          </div>
        ))}

        {packages.length === 0 && (
          <div className="col-span-full py-12 text-center text-muted-foreground glass border-dashed">
            No listing packages found. Create one to get started.
          </div>
        )}
      </div>
    </div>
  );
}
