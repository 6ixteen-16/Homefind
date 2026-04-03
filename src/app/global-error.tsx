"use client";

import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-navy-900 flex items-center justify-center p-6">
        <div className="text-center max-w-lg">
          <div className="w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-8">
            <AlertTriangle size={36} className="text-red-400" />
          </div>
          <div className="font-display text-6xl font-light text-gold-500/30 mb-4">500</div>
          <h1 className="font-display text-3xl font-light text-cream-100 mb-3">
            Something went wrong
          </h1>
          <p className="text-cream-400 mb-8 leading-relaxed">
            We encountered an unexpected error. Our team has been notified and is working to fix it.
          </p>
          {error.digest && (
            <p className="text-xs text-cream-600 font-mono mb-8">
              Error ID: {error.digest}
            </p>
          )}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={reset}
              className="flex items-center gap-2 px-6 py-3 bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400 transition-colors"
            >
              <RefreshCw size={16} />
              Try Again
            </button>
            <Link
              href="/"
              className="flex items-center gap-2 px-6 py-3 border border-white/20 text-cream-200 rounded-lg hover:bg-white/10 transition-colors"
            >
              <Home size={16} />
              Go Home
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
