import type { Metadata } from "next";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export const metadata: Metadata = { title: "Admin Login — Prestige Properties" };

export default async function AdminLoginPage() {
  const session = await auth();
  if (session?.user) redirect("/admin");

  return (
    <div className="min-h-screen bg-navy-900 flex items-center justify-center p-4">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-noise opacity-20 pointer-events-none" aria-hidden="true" />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="font-display text-4xl font-light text-cream-100 tracking-wide">Prestige</div>
          <div className="text-gold-400 text-xs tracking-[0.3em] uppercase font-semibold mt-1">Admin Portal</div>
        </div>

        {/* Card */}
        <div className="bg-card rounded-2xl border border-white/10 shadow-luxury-xl p-8">
          <h1 className="font-display text-2xl font-light text-foreground mb-1">Sign in</h1>
          <p className="text-sm text-muted-foreground mb-8">
            Enter your credentials to access the admin dashboard.
          </p>
          <AdminLoginForm />
        </div>

        <p className="text-center text-xs text-cream-600 mt-6">
          Protected area. Unauthorized access is prohibited.
        </p>
      </div>
    </div>
  );
}
