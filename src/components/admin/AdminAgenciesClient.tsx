"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Building2, Plus, Search, MoreVertical, 
  CheckCircle2, Mail, MapPin, Trash2, Edit2, Loader2 
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { toast } from "@/components/ui/toaster";
import Image from "next/image";

interface Agency {
  id: string;
  name: string;
  logoUrl: string | null;
  address: string | null;
  contactEmail: string | null;
  verifiedStatus: boolean;
  createdAt: string;
  _count: {
    users: number;
    properties: number;
  };
}

export function AdminAgenciesClient({ agencies: initialAgencies }: { agencies: Agency[] }) {
  const router = useRouter();
  const [agencies, setAgencies] = useState(initialAgencies);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAgency, setEditingAgency] = useState<Agency | null>(null);

  const filteredAgencies = agencies.filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure? This will permanently delete the agency.")) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/agencies/${id}`, { method: "DELETE" });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || "Failed to delete");
      
      setAgencies(agencies.filter(a => a.id !== id));
      toast({ title: "Agency deleted", variant: "success" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const payload = {
      name: formData.get("name"),
      contactEmail: formData.get("contactEmail") || null,
      address: formData.get("address") || null,
      logoUrl: formData.get("logoUrl") || null,
      verifiedStatus: formData.get("verifiedStatus") === "true",
    };

    try {
      const url = editingAgency ? `/api/admin/agencies/${editingAgency.id}` : "/api/admin/agencies";
      const method = editingAgency ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save agency");

      toast({ title: editingAgency ? "Agency updated" : "Agency created", variant: "success" });
      setIsModalOpen(false);
      setEditingAgency(null);
      router.refresh(); // Refresh server data
      
      // Update local state (optimistic or just let refresh handle it if page reloads)
      // For simplicity, we'll let the router.refresh() do its work and the user can reload if needed
      // but in a real app we'd fetch or update state here.
      window.location.reload(); 
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-card p-4 rounded-xl border border-border shadow-luxury">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
          <input
            type="text"
            placeholder="Search agencies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-luxury pl-9 text-sm"
          />
        </div>
        <button
          onClick={() => { setEditingAgency(null); setIsModalOpen(true); }}
          className="btn-gold w-full sm:w-auto flex items-center gap-2 justify-center"
        >
          <Plus size={16} /> Add Agency
        </button>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border shadow-luxury overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/40 border-b border-border">
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Agency</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contact</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center">Stats</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredAgencies.map((agency) => (
                <tr key={agency.id} className="hover:bg-muted/30 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center border border-border overflow-hidden shrink-0">
                        {agency.logoUrl ? (
                          <Image src={agency.logoUrl} alt="" width={40} height={40} className="object-contain p-1" />
                        ) : (
                          <Building2 size={16} className="text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-foreground">{agency.name}</div>
                        <div className="text-2xs text-muted-foreground">ID: {agency.id.slice(-8)}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      {agency.contactEmail && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Mail size={12} className="text-gold-500" />
                          {agency.contactEmail}
                        </div>
                      )}
                      {agency.address && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <MapPin size={12} className="text-gold-500" />
                          <span className="truncate max-w-[150px]">{agency.address}</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="inline-flex flex-col items-center">
                      <span className="text-sm font-bold text-foreground">{agency._count.properties}</span>
                      <span className="text-2xs text-muted-foreground uppercase">Listings</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {agency.verifiedStatus ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-100 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20">
                        <CheckCircle2 size={12} /> Verified
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">Standard</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => { setEditingAgency(agency); setIsModalOpen(true); }}
                        className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-navy-900 transition-colors"
                        title="Edit Agency"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        onClick={() => handleDelete(agency.id)}
                        disabled={loading}
                        className="p-2 hover:bg-red-50 rounded-lg text-muted-foreground hover:text-red-600 transition-colors"
                        title="Delete Agency"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredAgencies.length === 0 && (
            <div className="py-20 text-center">
              <Building2 className="mx-auto text-muted-foreground/30 mb-2" size={32} />
              <p className="text-sm text-muted-foreground">No agencies found matching your search.</p>
            </div>
          )}
        </div>
      </div>

      {/* Agency Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/60 backdrop-blur-sm">
          <div className="bg-card w-full max-w-md rounded-2xl border border-border shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/30">
              <h2 className="font-display text-lg font-light text-foreground">
                {editingAgency ? "Edit Agency" : "Add New Agency"}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-foreground mb-1.5 block">Agency Name *</label>
                <input 
                  name="name" 
                  defaultValue={editingAgency?.name} 
                  required 
                  className="input-luxury text-sm" 
                  placeholder="e.g. Prestige Estates"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground mb-1.5 block">Contact Email</label>
                <input 
                  name="contactEmail" 
                  type="email" 
                  defaultValue={editingAgency?.contactEmail || ""} 
                  className="input-luxury text-sm" 
                  placeholder="contact@agency.com"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground mb-1.5 block">Address</label>
                <input 
                  name="address" 
                  defaultValue={editingAgency?.address || ""} 
                  className="input-luxury text-sm" 
                  placeholder="123 Business St, City"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground mb-1.5 block">Logo URL</label>
                <input 
                  name="logoUrl" 
                  defaultValue={editingAgency?.logoUrl || ""} 
                  className="input-luxury text-sm" 
                  placeholder="https://cloudinary.com/..."
                />
              </div>
              <div className="flex items-center gap-3 pt-2">
                <input 
                  type="checkbox" 
                  id="v-status" 
                  name="verifiedStatus" 
                  value="true"
                  defaultChecked={editingAgency?.verifiedStatus}
                  className="w-4 h-4 accent-gold-500 rounded border-border"
                />
                <label htmlFor="v-status" className="text-sm text-foreground cursor-pointer">
                  Mark as Verified Agency
                </label>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="flex-1 btn-gold justify-center gap-2"
                >
                  {loading && <Loader2 size={16} className="animate-spin" />}
                  {editingAgency ? "Update Agency" : "Create Agency"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
