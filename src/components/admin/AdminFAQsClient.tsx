"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, GripVertical, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/toaster";

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string | null;
  sortOrder: number;
  isActive: boolean;
}

interface AdminFAQsClientProps {
  faqs: FAQ[];
}

export function AdminFAQsClient({ faqs: initialFaqs }: AdminFAQsClientProps) {
  const router = useRouter();
  const [faqs, setFaqs] = useState(initialFaqs);
  const [adding, setAdding] = useState(false);
  const [newQ, setNewQ] = useState("");
  const [newA, setNewA] = useState("");
  const [newCat, setNewCat] = useState("");
  const [saving, setSaving] = useState(false);

  const createFaq = async () => {
    if (!newQ.trim() || !newA.trim()) {
      toast({ title: "Question and answer are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/faqs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: newQ,
          answer: newA,
          category: newCat || null,
          sortOrder: faqs.length,
        }),
      });
      if (!res.ok) throw new Error();
      toast({ title: "FAQ created", variant: "success" });
      setNewQ(""); setNewA(""); setNewCat(""); setAdding(false);
      router.refresh();
    } catch {
      toast({ title: "Failed to create FAQ", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const deleteFaq = async (id: string) => {
    if (!confirm("Delete this FAQ?")) return;
    try {
      const res = await fetch(`/api/admin/faqs/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setFaqs((prev) => prev.filter((f) => f.id !== id));
      toast({ title: "FAQ deleted", variant: "success" });
    } catch {
      toast({ title: "Failed to delete FAQ", variant: "destructive" });
    }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    try {
      await fetch(`/api/admin/faqs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });
      setFaqs((prev) => prev.map((f) => f.id === id ? { ...f, isActive: !isActive } : f));
    } catch {
      toast({ title: "Failed to update FAQ", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      {/* FAQ list */}
      <div className="bg-card rounded-xl border border-border shadow-luxury divide-y divide-border overflow-hidden">
        {faqs.length === 0 && !adding && (
          <div className="py-16 text-center text-muted-foreground">
            No FAQs yet. Add your first one below.
          </div>
        )}
        {faqs.map((faq) => (
          <div key={faq.id} className="flex items-start gap-3 px-5 py-4">
            <GripVertical size={16} className="text-muted-foreground/40 mt-1 shrink-0 cursor-grab" />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-foreground text-sm mb-1">{faq.question}</div>
              <div
                className="text-xs text-muted-foreground line-clamp-2"
                dangerouslySetInnerHTML={{ __html: faq.answer }}
              />
              {faq.category && (
                <span className="text-2xs text-gold-600 font-medium mt-1 block">{faq.category}</span>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => toggleActive(faq.id, faq.isActive)}
                className={cn(
                  "text-xs px-2.5 py-1 rounded-full border font-medium transition-colors",
                  faq.isActive
                    ? "bg-green-50 text-green-700 border-green-200"
                    : "bg-gray-50 text-gray-500 border-gray-200"
                )}
              >
                {faq.isActive ? "Visible" : "Hidden"}
              </button>
              <button
                onClick={() => deleteFaq(faq.id)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                aria-label="Delete FAQ"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add new FAQ */}
      {!adding ? (
        <button
          onClick={() => setAdding(true)}
          className="btn-navy flex items-center gap-2"
        >
          <Plus size={16} /> Add FAQ
        </button>
      ) : (
        <div className="bg-card rounded-xl border border-gold-500/30 p-5 shadow-luxury space-y-4">
          <h3 className="font-semibold text-foreground">New FAQ</h3>
          <div>
            <label className="text-xs font-medium text-foreground mb-1 block">Question *</label>
            <input
              type="text"
              value={newQ}
              onChange={(e) => setNewQ(e.target.value)}
              placeholder="e.g. How do I schedule a viewing?"
              className="input-luxury text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground mb-1 block">Answer *</label>
            <textarea
              value={newA}
              onChange={(e) => setNewA(e.target.value)}
              rows={3}
              placeholder="Write the answer..."
              className="input-luxury text-sm resize-none"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground mb-1 block">Category (optional)</label>
            <input
              type="text"
              value={newCat}
              onChange={(e) => setNewCat(e.target.value)}
              placeholder="e.g. Buying, Renting, General"
              className="input-luxury text-sm"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={createFaq}
              disabled={saving}
              className="btn-gold"
            >
              {saving ? "Saving..." : "Save FAQ"}
            </button>
            <button
              onClick={() => { setAdding(false); setNewQ(""); setNewA(""); setNewCat(""); }}
              className="btn-navy"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
