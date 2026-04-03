"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Save, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/toaster";

const schema = z.object({
  siteName: z.string().min(1),
  tagline: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  whatsappNumber: z.string().optional(),
  facebookUrl: z.string().url().optional().or(z.literal("")),
  instagramUrl: z.string().url().optional().or(z.literal("")),
  linkedinUrl: z.string().url().optional().or(z.literal("")),
  twitterUrl: z.string().url().optional().or(z.literal("")),
  notificationEmail: z.string().email().optional().or(z.literal("")),
  ga4MeasurementId: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => { reset(d.settings || {}); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [reset]);

  const onSubmit = async (data: FormData) => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Save failed");
      toast({ title: "Settings saved", variant: "success" });
    } catch {
      toast({ title: "Failed to save settings", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={24} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  const Field = ({
    label, name, type = "text", placeholder,
  }: {
    label: string;
    name: keyof FormData;
    type?: string;
    placeholder?: string;
  }) => (
    <div>
      <label className="text-sm font-medium text-foreground mb-1.5 block">{label}</label>
      <input
        type={type}
        {...register(name)}
        placeholder={placeholder}
        className={cn(
          "input-luxury",
          errors[name] && "border-red-400"
        )}
      />
      {errors[name] && (
        <p className="text-xs text-red-500 mt-1">{errors[name]?.message}</p>
      )}
    </div>
  );

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="font-display text-display-sm font-light text-foreground">
          Site Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Global configuration for your website.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">

        {/* Branding */}
        <section className="bg-card rounded-xl border border-border p-6 space-y-4 shadow-luxury">
          <h2 className="font-semibold text-foreground">Branding</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Company Name *" name="siteName" placeholder="Prestige Properties" />
            <Field label="Tagline" name="tagline" placeholder="Exceptional Properties. Exceptional Service." />
          </div>
        </section>

        {/* Contact Info */}
        <section className="bg-card rounded-xl border border-border p-6 space-y-4 shadow-luxury">
          <h2 className="font-semibold text-foreground">Contact Information</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Phone" name="phone" placeholder="+1 (234) 567-8900" />
            <Field label="Email" name="email" type="email" placeholder="info@yoursite.com" />
            <Field label="WhatsApp Number (digits only)" name="whatsappNumber" placeholder="1234567890" />
            <Field label="Notification Email (inquiry alerts)" name="notificationEmail" type="email" placeholder="admin@yoursite.com" />
          </div>
          <Field label="Office Address" name="address" placeholder="123 Business District, Kampala, Uganda" />
        </section>

        {/* Social Media */}
        <section className="bg-card rounded-xl border border-border p-6 space-y-4 shadow-luxury">
          <h2 className="font-semibold text-foreground">Social Media</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Facebook URL" name="facebookUrl" placeholder="https://facebook.com/yourpage" />
            <Field label="Instagram URL" name="instagramUrl" placeholder="https://instagram.com/yourhandle" />
            <Field label="LinkedIn URL" name="linkedinUrl" placeholder="https://linkedin.com/company/yourco" />
            <Field label="X (Twitter) URL" name="twitterUrl" placeholder="https://x.com/yourhandle" />
          </div>
        </section>

        {/* Analytics */}
        <section className="bg-card rounded-xl border border-border p-6 space-y-4 shadow-luxury">
          <h2 className="font-semibold text-foreground">Analytics</h2>
          <Field label="Google Analytics 4 Measurement ID" name="ga4MeasurementId" placeholder="G-XXXXXXXXXX" />
        </section>

        <button
          type="submit"
          disabled={saving}
          className="btn-gold flex items-center gap-2"
        >
          {saving ? (
            <><Loader2 size={16} className="animate-spin" /> Saving...</>
          ) : (
            <><Save size={16} /> Save Settings</>
          )}
        </button>
      </form>
    </div>
  );
}
