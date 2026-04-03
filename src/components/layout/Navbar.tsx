"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { Menu, X, ChevronDown, Sun, Moon, Phone, Mail } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const navLinks = [
  { href: "/properties", label: "Properties" },
  {
    href: "/services",
    label: "Services",
    children: [
      { href: "/services#sales", label: "Property Sales" },
      { href: "/services#rentals", label: "Rentals" },
      { href: "/services#management", label: "Property Management" },
      { href: "/services#valuations", label: "Valuations" },
    ],
  },
  { href: "/about", label: "About" },
  { href: "/blog", label: "Blog" },
  { href: "/contact", label: "Contact" },
];

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isHomePage = pathname === "/";

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 60);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setIsMobileOpen(false);
    setOpenDropdown(null);
  }, [pathname]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isMobileOpen]);

  const isTransparent = isHomePage && !isScrolled;

  return (
    <>
      {/* Top bar */}
      <div
        className={cn(
          "hidden lg:flex items-center justify-between px-8 py-2 text-xs transition-all duration-300",
          isTransparent
            ? "bg-navy-900/80 text-cream-300"
            : "bg-navy-900 text-cream-200"
        )}
      >
        <div className="flex items-center gap-6">
          <a href="tel:+1234567890" className="flex items-center gap-1.5 hover:text-gold-400 transition-colors">
            <Phone size={12} />
            +1 (234) 567-8900
          </a>
          <a href="mailto:info@prestigeproperties.com" className="flex items-center gap-1.5 hover:text-gold-400 transition-colors">
            <Mail size={12} />
            info@prestigeproperties.com
          </a>
        </div>
        <div className="flex items-center gap-4">
          <span>Mon – Fri: 9am – 6pm</span>
          <span className="text-gold-500">|</span>
          <Link href="/admin" className="hover:text-gold-400 transition-colors">
            Agent Portal
          </Link>
        </div>
      </div>

      {/* Main navbar */}
      <header
        role="banner"
        className={cn(
          "sticky top-0 z-50 w-full transition-all duration-500",
          isTransparent
            ? "bg-transparent"
            : "bg-background/95 backdrop-blur-xl border-b border-border shadow-luxury"
        )}
      >
        <nav
          aria-label="Main navigation"
          className="section-container flex items-center justify-between h-[72px]"
        >
          {/* Logo */}
          <Link
            href="/"
            className="flex flex-col leading-none group"
            aria-label="Prestige Properties — Home"
          >
            <span
              className={cn(
                "font-display text-2xl font-light tracking-wide transition-colors duration-300",
                isTransparent ? "text-cream-100" : "text-navy-900 dark:text-cream-100"
              )}
            >
              Prestige
            </span>
            <span className="text-gold-500 text-xs tracking-[0.3em] uppercase font-semibold -mt-0.5">
              Properties
            </span>
          </Link>

          {/* Desktop nav links */}
          <div ref={dropdownRef} className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <div key={link.href} className="relative">
                {link.children ? (
                  <button
                    className={cn(
                      "nav-link flex items-center gap-1 px-4 py-2 rounded-lg",
                      isTransparent
                        ? "text-cream-200 hover:text-cream-100"
                        : "text-foreground/80 hover:text-foreground",
                      openDropdown === link.href && "text-gold-500"
                    )}
                    onClick={() =>
                      setOpenDropdown(openDropdown === link.href ? null : link.href)
                    }
                    aria-expanded={openDropdown === link.href}
                    aria-haspopup="true"
                  >
                    {link.label}
                    <ChevronDown
                      size={14}
                      className={cn(
                        "transition-transform duration-200",
                        openDropdown === link.href && "rotate-180"
                      )}
                    />
                  </button>
                ) : (
                  <Link
                    href={link.href}
                    className={cn(
                      "nav-link px-4 py-2 rounded-lg block",
                      isTransparent
                        ? "text-cream-200 hover:text-cream-100"
                        : "text-foreground/80 hover:text-foreground",
                      pathname === link.href && "active text-gold-500"
                    )}
                  >
                    {link.label}
                  </Link>
                )}

                {/* Dropdown */}
                <AnimatePresence>
                  {link.children && openDropdown === link.href && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      transition={{ duration: 0.15, ease: "easeOut" }}
                      className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-52 rounded-xl border border-border bg-card shadow-luxury-lg overflow-hidden"
                    >
                      {link.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          className="block px-4 py-3 text-sm text-foreground/80 hover:text-foreground hover:bg-muted transition-colors"
                        >
                          {child.label}
                        </Link>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            {mounted && (
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
                className={cn(
                  "p-2 rounded-lg transition-colors",
                  isTransparent
                    ? "text-cream-300 hover:text-cream-100 hover:bg-white/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
              </button>
            )}

            {/* CTA Button */}
            <Link href="/contact" className="hidden lg:inline-flex btn-gold text-sm px-5 py-2.5">
              List Your Property
            </Link>

            {/* Mobile hamburger */}
            <button
              onClick={() => setIsMobileOpen(!isMobileOpen)}
              aria-label={isMobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={isMobileOpen}
              aria-controls="mobile-menu"
              className={cn(
                "lg:hidden p-2 rounded-lg transition-colors",
                isTransparent
                  ? "text-cream-200 hover:bg-white/10"
                  : "text-foreground hover:bg-muted"
              )}
            >
              {isMobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileOpen(false)}
              className="fixed inset-0 z-40 bg-navy-900/60 backdrop-blur-sm lg:hidden"
            />

            {/* Drawer */}
            <motion.div
              id="mobile-menu"
              role="dialog"
              aria-label="Mobile navigation"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="fixed top-0 right-0 bottom-0 z-50 w-80 max-w-full bg-card border-l border-border shadow-luxury-xl flex flex-col lg:hidden"
            >
              {/* Drawer header */}
              <div className="flex items-center justify-between p-6 border-b border-border">
                <span className="font-display text-xl text-foreground">Navigation</span>
                <button
                  onClick={() => setIsMobileOpen(false)}
                  aria-label="Close menu"
                  className="p-2 rounded-lg hover:bg-muted transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Drawer links */}
              <nav className="flex-1 overflow-y-auto p-6 space-y-1">
                {navLinks.map((link, i) => (
                  <motion.div
                    key={link.href}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Link
                      href={link.href}
                      className={cn(
                        "block px-4 py-3 rounded-lg text-base font-medium transition-colors",
                        pathname === link.href
                          ? "bg-gold-500/10 text-gold-600"
                          : "text-foreground/80 hover:text-foreground hover:bg-muted"
                      )}
                    >
                      {link.label}
                    </Link>
                    {link.children && (
                      <div className="ml-4 mt-1 space-y-1 border-l border-gold-500/20 pl-4">
                        {link.children.map((child) => (
                          <Link
                            key={child.href}
                            href={child.href}
                            className="block py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {child.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </motion.div>
                ))}
              </nav>

              {/* Drawer footer */}
              <div className="p-6 border-t border-border space-y-3">
                <Link
                  href="/contact"
                  className="btn-gold w-full justify-center"
                  onClick={() => setIsMobileOpen(false)}
                >
                  List Your Property
                </Link>
                <Link
                  href="/admin"
                  className="block text-center text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
                >
                  Agent Portal
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
