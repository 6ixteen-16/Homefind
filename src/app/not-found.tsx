import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Search, Home, ArrowRight } from "lucide-react";

export default function NotFound() {
  return (
    <>
      <Navbar />
      <main className="min-h-[70vh] flex items-center justify-center py-20">
        <div className="section-container text-center">
          <div className="font-display text-[10rem] font-light text-gold-500/20 leading-none select-none mb-4">
            404
          </div>
          <h1 className="font-display text-display-md font-light text-foreground mb-4 -mt-8">
            Property Not Found
          </h1>
          <p className="text-muted-foreground text-lg max-w-md mx-auto mb-10">
            The page you&apos;re looking for doesn&apos;t exist or may have been removed.
            Let&apos;s help you find what you&apos;re looking for.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Link href="/properties" className="btn-gold">
              <Search size={16} />
              Browse All Properties
            </Link>
            <Link href="/" className="btn-navy">
              <Home size={16} />
              Back to Home
            </Link>
          </div>

          {/* Quick links */}
          <div className="border-t border-border pt-10">
            <p className="text-sm text-muted-foreground mb-4">Popular destinations</p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              {[
                { href: "/properties?category=RESIDENTIAL", label: "Residential" },
                { href: "/properties?category=COMMERCIAL", label: "Commercial" },
                { href: "/properties?listingType=RENT", label: "For Rent" },
                { href: "/properties?listingType=SALE", label: "For Sale" },
                { href: "/contact", label: "Contact Us" },
                { href: "/about", label: "About Us" },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-1.5 text-sm text-gold-600 hover:text-gold-700 transition-colors group"
                >
                  {link.label}
                  <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
