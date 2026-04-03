"use client";

import { useState } from "react";
import { ArrowRight, Loader2, CheckCircle2 } from "lucide-react";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setStatus("loading");
    setError("");

    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to subscribe");
      setStatus("success");
      setEmail("");
    } catch (err: any) {
      setStatus("error");
      setError(err.message || "Something went wrong. Please try again.");
    }
  };

  if (status === "success") {
    return (
      <div className="flex items-center gap-2 text-sm text-green-400 py-2">
        <CheckCircle2 size={16} />
        <span>You're subscribed! Thank you.</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex gap-2">
        <input
          type="email"
          placeholder="Your email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="flex-1 bg-white/10 border border-white/20 text-cream-100 placeholder:text-cream-500 text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-gold-500/60 transition-colors"
          aria-label="Newsletter email"
          disabled={status === "loading"}
        />
        <button
          type="submit"
          disabled={status === "loading" || !email}
          aria-label="Subscribe to newsletter"
          className="p-2.5 bg-gold-500 text-navy-900 rounded-lg hover:bg-gold-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
        >
          {status === "loading"
            ? <Loader2 size={16} className="animate-spin" />
            : <ArrowRight size={16} />}
        </button>
      </div>
      {status === "error" && (
        <p className="text-xs text-red-400">{error}</p>
      )}
      <p className="text-2xs text-cream-600">
        No spam, ever. Unsubscribe anytime.
      </p>
    </form>
  );
}
