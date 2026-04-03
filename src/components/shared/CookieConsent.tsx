"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cookie, X, Check, Settings } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type ConsentState = {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
};

const CONSENT_KEY = "pp-cookie-consent";
const CONSENT_VERSION = "1";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [consent, setConsent] = useState<ConsentState>({
    necessary: true,
    analytics: false,
    marketing: false,
  });

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (!stored) {
      // Small delay to not show immediately on page load
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
    try {
      const parsed = JSON.parse(stored);
      if (parsed.version !== CONSENT_VERSION) {
        setVisible(true);
      }
    } catch {
      setVisible(true);
    }
  }, []);

  const save = (c: ConsentState) => {
    localStorage.setItem(CONSENT_KEY, JSON.stringify({ ...c, version: CONSENT_VERSION }));
    setVisible(false);

    // Initialize GA4 if analytics consented
    if (c.analytics && typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("consent", "update", {
        analytics_storage: "granted",
      });
    }
  };

  const acceptAll = () => save({ necessary: true, analytics: true, marketing: true });
  const rejectNonEssential = () => save({ necessary: true, analytics: false, marketing: false });
  const saveCustom = () => save(consent);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 200 }}
          role="dialog"
          aria-label="Cookie consent"
          aria-modal="false"
          className="cookie-banner"
        >
          <div className="max-w-7xl mx-auto">
            {!showDetails ? (
              /* Simple view */
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <Cookie size={20} className="text-gold-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-cream-200 font-medium mb-0.5">
                      We use cookies to enhance your experience
                    </p>
                    <p className="text-xs text-cream-400">
                      We use essential cookies plus optional analytics cookies to improve our site.{" "}
                      <Link href="/cookie-policy" className="text-gold-400 hover:text-gold-300 underline">
                        Learn more
                      </Link>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setShowDetails(true)}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs text-cream-300 hover:text-cream-100 border border-white/20 rounded-lg transition-colors"
                  >
                    <Settings size={12} />
                    Customize
                  </button>
                  <button
                    onClick={rejectNonEssential}
                    className="px-4 py-2 text-xs text-cream-200 border border-white/20 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    Reject non-essential
                  </button>
                  <button
                    onClick={acceptAll}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400 transition-colors"
                  >
                    <Check size={12} />
                    Accept all
                  </button>
                  <button
                    onClick={rejectNonEssential}
                    aria-label="Close without accepting"
                    className="p-1.5 text-cream-500 hover:text-cream-300 transition-colors ml-1"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            ) : (
              /* Detailed view */
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-cream-100 font-semibold">Cookie Preferences</h3>
                  <button
                    onClick={() => setShowDetails(false)}
                    className="text-cream-400 hover:text-cream-200 transition-colors"
                    aria-label="Back to simple view"
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="grid sm:grid-cols-3 gap-3">
                  {[
                    {
                      key: "necessary" as const,
                      label: "Strictly Necessary",
                      desc: "Session, auth, and security cookies. Cannot be disabled.",
                      locked: true,
                    },
                    {
                      key: "analytics" as const,
                      label: "Analytics",
                      desc: "Help us understand how visitors use our site (Google Analytics 4).",
                      locked: false,
                    },
                    {
                      key: "marketing" as const,
                      label: "Marketing",
                      desc: "Used to track effectiveness of marketing campaigns.",
                      locked: false,
                    },
                  ].map(({ key, label, desc, locked }) => (
                    <div key={key} className="flex items-start gap-3 bg-white/5 rounded-xl p-3 border border-white/10">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-cream-200">{label}</div>
                        <div className="text-xs text-cream-400 mt-0.5">{desc}</div>
                      </div>
                      <label className="relative shrink-0 mt-0.5">
                        <input
                          type="checkbox"
                          checked={consent[key]}
                          disabled={locked}
                          onChange={(e) =>
                            !locked && setConsent((prev) => ({ ...prev, [key]: e.target.checked }))
                          }
                          className="sr-only"
                        />
                        <div
                          className={cn(
                            "w-10 h-5 rounded-full transition-colors duration-200 relative",
                            consent[key] ? "bg-gold-500" : "bg-white/20",
                            locked && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          <div
                            className={cn(
                              "absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200",
                              consent[key] && "translate-x-5"
                            )}
                          />
                        </div>
                      </label>
                    </div>
                  ))}
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={rejectNonEssential}
                    className="px-4 py-2 text-xs text-cream-300 border border-white/20 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    Reject all
                  </button>
                  <button
                    onClick={saveCustom}
                    className="px-5 py-2 text-xs bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400 transition-colors"
                  >
                    Save preferences
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
