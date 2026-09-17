"use client";

import { useState } from "react";
import { Plus, Check, X, Edit, Trash2, Loader2, Package } from "lucide-react";
import { cn, formatPrice } from "@/lib/utils";

interface PackageFormData {
  name: string;
  description: string;
  price: number;
  currency: string;
  listingLimit: number;
  durationDays: number;
  isPopular: boolean;
  isActive: boolean;
}

const defaultForm: PackageFormData = {
  name: "",
  description: "",
  price: 0,
  currency: "USD",
  listingLimit: 10,
  durationDays: 30,
  isPopular: false,
  isActive: true,
};

export function AdminPackagesClient({ packages: initialPackages }: { packages: any[] }) {
  const [packages, setPackages] = useState(initialPackages);
  const [showModal, setShowModal] = useState(false);
  const [editingPkg, setEditingPkg] = useState<any | null>(null);
  const [form, setForm] = useState<PackageFormData>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const openCreate = () => {
    setEditingPkg(null);
    setForm(defaultForm);
    setError("");
    setShowModal(true);
  };

  const openEdit = (pkg: any) => {
    setEditingPkg(pkg);
    setForm({
      name: pkg.name,
      description: pkg.description || "",
      price: pkg.price,
      currency: pkg.currency || "USD",
      listingLimit: pkg.listingLimit,
      durationDays: pkg.durationDays,
      isPopular: pkg.isPopular,
      isActive: pkg.isActive,
    });
    setError("");
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setError("Package name is required."); return; }
    if (form.price <= 0) { setError("Price must be positive."); return; }
    setSaving(true);
    setError("");
    try {
      const url = editingPkg ? `/api/admin/packages/${editingPkg.id}` : "/api/admin/packages";
      const method = editingPkg ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Save failed");

      if (editingPkg) {
        setPackages((prev: any[]) => prev.map((p) => p.id === editingPkg.id ? { ...p, ...result } : p));
      } else {
        setPackages((prev: any[]) => [...prev, result]);
      }
      setShowModal(false);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/packages/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setPackages((prev: any[]) => prev.filter((p) => p.id !== id));
      setDeleteConfirm(null);
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
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
                    {pkg.listingLimit === -1 ? "Unlimited" : pkg.listingLimit} Listings
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Check size={16} className="text-green-500" />
                  <span>{pkg._count?.agencies || 0} active agencies</span>
                </div>
              </div>
            </div>
            
            <div className="border-t border-border p-4 flex justify-between bg-muted/30">
              <button
                onClick={() => openEdit(pkg)}
                className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium flex items-center gap-1"
              >
                <Edit size={14} /> Edit
              </button>
              <button
                onClick={() => setDeleteConfirm(pkg.id)}
                className="text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 font-medium flex items-center gap-1"
              >
                <Trash2 size={14} /> Delete
              </button>
            </div>
          </div>
        ))}

        {packages.length === 0 && (
          <div className="col-span-full py-16 text-center text-muted-foreground glass border-dashed rounded-xl flex flex-col items-center gap-3">
            <Package size={32} className="opacity-40" />
            <p>No listing packages yet. Create one to get started.</p>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="font-display text-xl font-light">
                {editingPkg ? "Edit Package" : "New Listing Package"}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-lg hover:bg-muted transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg px-4 py-3 text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">Package Name *</label>
                <input
                  className="input-luxury"
                  placeholder="e.g. Basic, Professional, Enterprise"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">Description</label>
                <textarea
                  className="input-luxury resize-none text-sm"
                  rows={2}
                  placeholder="Brief description of what's included..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-foreground mb-1 block">Price *</label>
                  <input
                    type="number"
                    className="input-luxury"
                    placeholder="99.00"
                    value={form.price || ""}
                    onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground mb-1 block">Currency</label>
                  <select
                    className="input-luxury"
                    value={form.currency}
                    onChange={(e) => setForm({ ...form, currency: e.target.value })}
                  >
                    {["USD", "UGX", "EUR", "GBP", "KES"].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-foreground mb-1 block">Listing Limit</label>
                  <input
                    type="number"
                    className="input-luxury"
                    placeholder="10 (use -1 for unlimited)"
                    value={form.listingLimit}
                    onChange={(e) => setForm({ ...form, listingLimit: Number(e.target.value) })}
                  />
                  <p className="text-2xs text-muted-foreground mt-1">Use -1 for unlimited listings</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground mb-1 block">Duration (days)</label>
                  <input
                    type="number"
                    className="input-luxury"
                    placeholder="30"
                    value={form.durationDays}
                    onChange={(e) => setForm({ ...form, durationDays: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="flex gap-6 pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    className="accent-gold-500"
                    checked={form.isPopular}
                    onChange={(e) => setForm({ ...form, isPopular: e.target.checked })}
                  />
                  Mark as most popular
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    className="accent-gold-500"
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  />
                  Active
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
              <button onClick={() => setShowModal(false)} className="btn-navy px-6">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving} className="btn-gold px-6 flex items-center gap-2">
                {saving ? <><Loader2 size={15} className="animate-spin" /> Saving...</> : "Save Package"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-sm p-6 text-center">
            <Trash2 size={32} className="text-red-500 mx-auto mb-4" />
            <h3 className="font-semibold text-foreground mb-2">Delete Package?</h3>
            <p className="text-sm text-muted-foreground mb-6">
              This action cannot be undone. Agencies using this package will not be affected immediately.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="btn-navy flex-1">Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl px-4 py-2.5 transition-colors text-sm">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
