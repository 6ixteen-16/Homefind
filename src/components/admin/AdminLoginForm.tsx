"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

const schema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type FormData = z.infer<typeof schema>;

export function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/admin";

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        email: data.email.toLowerCase(),
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        if (result.error === "AccountLocked") {
          setError("Your account is temporarily locked. Please try again in 30 minutes.");
        } else {
          setError("Invalid email or password. Please try again.");
        }
        setIsLoading(false);
        return;
      }

      router.push(callbackUrl);
      router.refresh();
    } catch {
      setError("An unexpected error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      {/* Error alert */}
      {error && (
        <div role="alert" className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
          <Lock size={15} className="shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* Email */}
      <div>
        <label htmlFor="admin-email" className="text-sm font-medium text-foreground mb-1.5 block">
          Email Address
        </label>
        <div className="relative">
          <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            id="admin-email"
            type="email"
            {...register("email")}
            autoComplete="email"
            placeholder="admin@example.com"
            className={cn(
              "input-luxury pl-10",
              errors.email && "border-red-400 focus:border-red-400 focus:ring-red-400/20"
            )}
          />
        </div>
        {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
      </div>

      {/* Password */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label htmlFor="admin-password" className="text-sm font-medium text-foreground">
            Password
          </label>
          <a href="/admin/forgot-password" className="text-xs text-gold-600 hover:text-gold-700 transition-colors">
            Forgot password?
          </a>
        </div>
        <div className="relative">
          <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            id="admin-password"
            type={showPassword ? "text" : "password"}
            {...register("password")}
            autoComplete="current-password"
            placeholder="••••••••"
            className={cn(
              "input-luxury pl-10 pr-10",
              errors.password && "border-red-400"
            )}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isLoading}
        className="btn-gold w-full justify-center py-3.5 mt-2 text-base"
      >
        {isLoading ? (
          <><Loader2 size={18} className="animate-spin" /> Signing in...</>
        ) : (
          "Sign in to Dashboard"
        )}
      </button>
    </form>
  );
}
