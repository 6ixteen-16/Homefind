"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, UserCircle2 } from "lucide-react";
import { toast } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";

interface TeamMember {
  id: string;
  name: string;
  title: string;
  bio: string | null;
  photo: string | null;
  phone: string | null;
  email: string | null;
  linkedin: string | null;
  sortOrder: number;
  isActive: boolean;
}

export function AdminTeamClient({ team: initialTeam }: { team: TeamMember[] }) {
  const router = useRouter();
  const [team, setTeam] = useState(initialTeam);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "", title: "", bio: "", photo: "", phone: "", email: "", linkedin: "",
  });

  const create = async () => {
    if (!form.name.trim() || !form.title.trim()) {
      toast({ title: "Name and title are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, sortOrder: team.length }),
      });
      if (!res.ok) throw new Error();
      toast({ title: "Team member added", variant: "success" });
      setAdding(false);
      setForm({ name: "", title: "", bio: "", photo: "", phone: "", email: "", linkedin: "" });
      router.refresh();
    } catch {
      toast({ title: "Failed to add member", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Remove this team member?")) return;
    try {
      await fetch(`/api/admin/team/${id}`, { method: "DELETE" });
      setTeam((prev) => prev.filter((m) => m.id !== id));
      toast({ title: "Member removed", variant: "success" });
    } catch {
      toast({ title: "Failed to remove", variant: "destructive" });
    }
  };

  const Field = ({ label, field, type = "text", placeholder }: {
    label: string; field: keyof typeof form; type?: string; placeholder?: string;
  }) => (
    <div>
      <label className="text-xs font-medium text-foreground mb-1 block">{label}</label>
      <input
        type={type}
        value={form[field]}
        onChange={(e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))}
        placeholder={placeholder}
        className="input-luxury text-sm"
      />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {team.map((member) => (
          <div key={member.id} className="bg-card rounded-xl border border-border shadow-luxury overflow-hidden group">
            <div className="relative h-40 bg-gradient-luxury">
              {member.photo ? (
                <Image src={member.photo} alt={member.name} fill className="object-cover" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <UserCircle2 size={48} className="text-gold-400/50" />
                </div>
              )}
              <button
                onClick={() => remove(member.id)}
                className="absolute top-2 right-2 p-1.5 rounded-lg bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Remove member"
              >
                <Trash2 size={13} />
              </button>
            </div>
            <div className="p-4">
              <div className="font-semibold text-foreground">{member.name}</div>
              <div className="text-sm text-gold-600">{member.title}</div>
              {member.bio && (
                <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{member.bio}</p>
              )}
              <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                {member.email && <a href={`mailto:${member.email}`} className="hover:text-foreground transition-colors">Email</a>}
                {member.phone && <a href={`tel:${member.phone}`} className="hover:text-foreground transition-colors">Call</a>}
                {member.linkedin && <a href={member.linkedin} target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">LinkedIn</a>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {!adding ? (
        <button onClick={() => setAdding(true)} className="btn-navy flex items-center gap-2">
          <Plus size={16} /> Add Team Member
        </button>
      ) : (
        <div className="bg-card rounded-xl border border-gold-500/30 p-5 shadow-luxury space-y-4">
          <h3 className="font-semibold text-foreground">New Team Member</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Full Name *" field="name" placeholder="Jane Smith" />
            <Field label="Job Title *" field="title" placeholder="Senior Property Agent" />
            <Field label="Email" field="email" type="email" placeholder="jane@example.com" />
            <Field label="Phone" field="phone" placeholder="+1 234 567 890" />
            <Field label="LinkedIn URL" field="linkedin" placeholder="https://linkedin.com/in/jane" />
            <Field label="Photo URL (Cloudinary)" field="photo" placeholder="https://res.cloudinary.com/..." />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground mb-1 block">Bio</label>
            <textarea
              value={form.bio}
              onChange={(e) => setForm((prev) => ({ ...prev, bio: e.target.value }))}
              rows={2}
              placeholder="Brief biography..."
              className="input-luxury text-sm resize-none"
            />
          </div>
          <div className="flex gap-3">
            <button onClick={create} disabled={saving} className="btn-gold">
              {saving ? "Saving..." : "Add Member"}
            </button>
            <button onClick={() => setAdding(false)} className="btn-navy">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
