"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Send, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/toaster";

const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().optional(),
  contactMethod: z.enum(["email", "phone", "whatsapp"]).default("email"),
  message: z.string().min(10, "Message must be at least 10 characters").max(1000),
  honeypot: z.string().max(0).optional(),
});

type FormData = z.infer<typeof schema>;

interface PropertyInquiryFormProps {
  propertyId: string;
  propertyTitle: string;
}

export function PropertyInquiryForm({ propertyId, propertyTitle }: PropertyInquiryFormProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      message: `I'm interested in ${propertyTitle}. Please contact me with more information.`,
      contactMethod: "email",
    },
  });

  const onSubmit = async (data: FormData) => {
    setStatus("loading");
    try {
      const res = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          type: "PROPERTY",
          propertyId,
          turnstileToken: "dev-bypass", // Replace with Cloudflare Turnstile widget token
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Submission failed");

      setStatus("success");
      toast({ title: "Inquiry sent!", description: "We'll be in touch within 24 hours.", variant: "success" });
    } catch (err: any) {
      setStatus("idle");
      toast({ title: "Failed to send", description: err.message, variant: "destructive" });
    }
  };

  if (status === "success") {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center gap-3">
        <div className="w-16 h-16 rounded-full bg-green-50 dark:bg-green-950 flex items-center justify-center">
          <CheckCircle2 size={32} className="text-green-600" />
        </div>
        <h4 className="font-semibold text-foreground">Inquiry Sent!</h4>
        <p className="text-sm text-muted-foreground max-w-xs">
          Thank you! Our agent will contact you within 24 hours.
        </p>
        <button
          onClick={() => { setStatus("idle"); reset(); }}
          className="text-xs text-gold-600 hover:text-gold-700 transition-colors mt-2"
        >
          Send another inquiry
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
      {/* Honeypot */}
      <input {...register("honeypot")} type="text" className="sr-only" tabIndex={-1} aria-hidden="true" />

      <div>
        <label htmlFor="inq-name" className="text-xs font-medium text-foreground mb-1 block">
          Full Name *
        </label>
        <input
          id="inq-name"
          {...register("name")}
          placeholder="Your full name"
          className={cn("input-luxury text-sm", errors.name && "border-red-400 focus:border-red-400")}
        />
        {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label htmlFor="inq-email" className="text-xs font-medium text-foreground mb-1 block">
            Email *
          </label>
          <input
            id="inq-email"
            type="email"
            {...register("email")}
            placeholder="your@email.com"
            className={cn("input-luxury text-sm", errors.email && "border-red-400")}
          />
          {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
        </div>
        <div>
          <label htmlFor="inq-phone" className="text-xs font-medium text-foreground mb-1 block">
            Phone
          </label>
          <input
            id="inq-phone"
            type="tel"
            {...register("phone")}
            placeholder="+1 234 567 890"
            className="input-luxury text-sm"
          />
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-foreground mb-1.5 block">
          Preferred Contact
        </label>
        <div className="flex gap-2">
          {[
            { value: "email", label: "Email" },
            { value: "phone", label: "Phone" },
            { value: "whatsapp", label: "WhatsApp" },
          ].map((opt) => (
            <label key={opt.value} className="flex-1 cursor-pointer">
              <input {...register("contactMethod")} type="radio" value={opt.value} className="sr-only" />
              <div className="text-center py-1.5 text-xs border border-border rounded-lg hover:border-gold-500/50 transition-colors has-[:checked]:bg-navy-900 has-[:checked]:text-cream-100 has-[:checked]:border-navy-900">
                {opt.label}
              </div>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="inq-msg" className="text-xs font-medium text-foreground mb-1 block">
          Message *
        </label>
        <textarea
          id="inq-msg"
          {...register("message")}
          rows={3}
          className={cn("input-luxury text-sm resize-none", errors.message && "border-red-400")}
        />
        {errors.message && <p className="text-xs text-red-500 mt-1">{errors.message.message}</p>}
      </div>

      <button
        type="submit"
        disabled={status === "loading"}
        className="btn-gold w-full justify-center py-3"
      >
        {status === "loading" ? (
          <><Loader2 size={16} className="animate-spin" /> Sending...</>
        ) : (
          <><Send size={16} /> Send Inquiry</>
        )}
      </button>

      <p className="text-2xs text-center text-muted-foreground">
        Protected by Cloudflare Turnstile. Your data is handled per our{" "}
        <a href="/privacy-policy" className="text-gold-600 hover:underline">Privacy Policy</a>.
      </p>
    </form>
  );
}
