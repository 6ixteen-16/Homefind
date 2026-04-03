"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Star } from "lucide-react";
import { toast } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";

interface Testimonial {
  id: string;
  clientName: string;
  clientTitle: string | null;
  clientPhoto: string | null;
  rating: number;
  text: string;
  isActive: boolean;
  sortOrder: number;
}

export function AdminTestimonialsClient({ testimonials: init }: { testimonials: Testimonial[] }) {
  const router = useRouter();
  const [items, setItems] = useState(init);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    clientName: "", clientTitle: "", text: "", rating: 5, clientPhoto: "",
  });

  const create = async () => {
    if (!form.clientName.trim() || !form.text.trim()) {
      toast({ title: "Name and review text required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/testimonials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, sortOrder: items.length }),
      });
      if (!res.ok) throw new Error();
      toast({ title: "Testimonial added", variant: "success" });
      setAdding(false);
      setForm({ clientName: "", clientTitle: "", text: "", rating: 5, clientPhoto: "" });
      router.refresh();
    } catch {
      toast({ title: "Failed to add testimonial", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this testimonial?")) return;
    try {
      await fetch(`/api/admin/testimonials/${id}`, { method: "DELETE" });
      setItems((prev) => prev.filter((t) => t.id !== id));
      toast({ title: "Deleted", variant: "success" });
    } catch {
      toast({ title: "Failed to delete", variant: "destructive" });
    }
  };

  const toggleActive = async (id: string, current: boolean) => {
    try {
      await fetch(`/api/admin/testimonials/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !current }),
      });
      setItems((prev) => prev.map((t) => t.id === id ? { ...t, isActive: !current } : t));
    } catch {
      toast({ title: "Failed to update", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-xl border border-border shadow-luxury divide-y divide-border overflow-hidden">
        {items.length === 0 && !adding && (
          <div className="py-16 text-center text-muted-foreground">No testimonials yet.</div>
        )}
        {items.map((t) => (
          <div key={t.id} className="flex items-start gap-4 px-5 py-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-foreground text-sm">{t.clientName}</span>
                {t.clientTitle && <span className="text-xs text-muted-foreground">— {t.clientTitle}</span>}
              </div>
              <div className="flex gap-0.5 mb-2" aria-label={`${t.rating} stars`}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={12} className={i < t.rating ? "text-gold-500 fill-current" : "text-muted-foreground/30"} />
                ))}
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2 italic">&ldquo;{t.text}&rdquo;</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => toggleActive(t.id, t.isActive)}
                className={cn(
                  "text-xs px-2.5 py-1 rounded-full border font-medium transition-colors",
                  t.isActive ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50 text-gray-500 border-gray-200"
                )}
              >
                {t.isActive ? "Visible" : "Hidden"}
              </button>
              <button
                onClick={() => remove(t.id)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors"
                aria-label="Delete"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {!adding ? (
        <button onClick={() => setAdding(true)} className="btn-navy flex items-center gap-2">
          <Plus size={16} /> Add Testimonial
        </button>
      ) : (
        <div className="bg-card rounded-xl border border-gold-500/30 p-5 shadow-luxury space-y-4">
          <h3 className="font-semibold text-foreground">New Testimonial</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { label: "Client Name *", field: "clientName" as const, placeholder: "Sarah Johnson" },
              { label: "Client Title", field: "clientTitle" as const, placeholder: "Homeowner" },
              { label: "Photo URL (optional)", field: "clientPhoto" as const, placeholder: "https://..." },
            ].map(({ label, field, placeholder }) => (
              <div key={field}>
                <label className="text-xs font-medium text-foreground mb-1 block">{label}</label>
                <input
                  type="text"
                  value={form[field]}
                  onChange={(e) => setForm((p) => ({ ...p, [field]: e.target.value }))}
                  placeholder={placeholder}
                  className="input-luxury text-sm"
                />
              </div>
            ))}
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">Rating</label>
              <select
                value={form.rating}
                onChange={(e) => setForm((p) => ({ ...p, rating: Number(e.target.value) }))}
                className="input-luxury text-sm"
              >
                {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} star{n !== 1 ? "s" : ""}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-foreground mb-1 block">Review Text *</label>
            <textarea
              value={form.text}
              onChange={(e) => setForm((p) => ({ ...p, text: e.target.value }))}
              rows={3}
              placeholder="What the client said..."
              className="input-luxury text-sm resize-none"
            />
          </div>
          <div className="flex gap-3">
            <button onClick={create} disabled={saving} className="btn-gold">
              {saving ? "Saving..." : "Add Testimonial"}
            </button>
            <button onClick={() => setAdding(false)} className="btn-navy">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
