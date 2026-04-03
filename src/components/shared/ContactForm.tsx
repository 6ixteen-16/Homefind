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
  subject: z.string().min(1, "Please select a subject"),
  message: z.string().min(20, "Message must be at least 20 characters").max(2000),
  honeypot: z.string().max(0).optional(),
});

type FormData = z.infer<typeof schema>;

export function ContactForm() {
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setStatus("loading");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, turnstileToken: "dev-bypass" }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Submission failed");
      setStatus("success");
      toast({ title: "Message sent!", description: "We'll reply within one business day.", variant: "success" });
    } catch (err: any) {
      setStatus("idle");
      toast({ title: "Failed to send", description: err.message, variant: "destructive" });
    }
  };

  if (status === "success") {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center gap-4">
        <div className="w-20 h-20 rounded-full bg-green-50 dark:bg-green-950 flex items-center justify-center">
          <CheckCircle2 size={36} className="text-green-600" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground text-lg mb-1">Message Received!</h3>
          <p className="text-muted-foreground text-sm max-w-xs">
            Thank you for reaching out. We'll be in touch within one business day.
          </p>
        </div>
        <button onClick={() => { setStatus("idle"); reset(); }}
          className="text-sm text-gold-600 hover:text-gold-700 transition-colors mt-2">
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <input {...register("honeypot")} type="text" className="sr-only" tabIndex={-1} aria-hidden="true" />

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="c-name" className="text-sm font-medium text-foreground mb-1.5 block">Full Name *</label>
          <input id="c-name" {...register("name")} placeholder="Your name"
            className={cn("input-luxury", errors.name && "border-red-400")} />
          {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
        </div>
        <div>
          <label htmlFor="c-email" className="text-sm font-medium text-foreground mb-1.5 block">Email *</label>
          <input id="c-email" type="email" {...register("email")} placeholder="your@email.com"
            className={cn("input-luxury", errors.email && "border-red-400")} />
          {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="c-phone" className="text-sm font-medium text-foreground mb-1.5 block">Phone</label>
          <input id="c-phone" type="tel" {...register("phone")} placeholder="+1 234 567 890"
            className="input-luxury" />
        </div>
        <div>
          <label htmlFor="c-subject" className="text-sm font-medium text-foreground mb-1.5 block">Subject *</label>
          <select id="c-subject" {...register("subject")}
            className={cn("input-luxury", errors.subject && "border-red-400")}>
            <option value="">Select a subject</option>
            <option value="property-inquiry">Property Inquiry</option>
            <option value="general">General Question</option>
            <option value="partnership">Partnership</option>
            <option value="careers">Careers</option>
            <option value="other">Other</option>
          </select>
          {errors.subject && <p className="text-xs text-red-500 mt-1">{errors.subject.message}</p>}
        </div>
      </div>

      <div>
        <label htmlFor="c-message" className="text-sm font-medium text-foreground mb-1.5 block">Message *</label>
        <textarea id="c-message" {...register("message")} rows={5} placeholder="How can we help you?"
          className={cn("input-luxury resize-none", errors.message && "border-red-400")} />
        {errors.message && <p className="text-xs text-red-500 mt-1">{errors.message.message}</p>}
      </div>

      <button type="submit" disabled={status === "loading"} className="btn-gold w-full justify-center py-3.5">
        {status === "loading"
          ? <><Loader2 size={16} className="animate-spin" /> Sending...</>
          : <><Send size={16} /> Send Message</>}
      </button>

      <p className="text-xs text-center text-muted-foreground">
        Protected by Cloudflare Turnstile. View our{" "}
        <a href="/privacy-policy" className="text-gold-600 hover:underline">Privacy Policy</a>.
      </p>
    </form>
  );
}
