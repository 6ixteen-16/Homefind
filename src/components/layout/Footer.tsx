import Link from "next/link";
import { Facebook, Instagram, Linkedin, Twitter, Youtube, Mail, Phone, MapPin, ArrowRight } from "lucide-react";
import { NewsletterForm } from "@/components/shared/NewsletterForm";

const propertyLinks = [
  { href: "/properties?type=SALE", label: "Properties for Sale" },
  { href: "/properties?type=RENT", label: "Properties for Rent" },
  { href: "/properties?category=COMMERCIAL", label: "Commercial Properties" },
  { href: "/properties?category=LAND", label: "Land & Plots" },
  { href: "/properties/map", label: "Map Search" },
];

const companyLinks = [
  { href: "/about", label: "About Us" },
  { href: "/about#team", label: "Our Team" },
  { href: "/services", label: "Services" },
  { href: "/blog", label: "News & Blog" },
  { href: "/contact", label: "Contact Us" },
];

const legalLinks = [
  { href: "/privacy-policy", label: "Privacy Policy" },
  { href: "/terms-of-service", label: "Terms of Service" },
  { href: "/cookie-policy", label: "Cookie Policy" },
];

const socialLinks = [
  { href: "#", label: "Facebook", icon: Facebook },
  { href: "#", label: "Instagram", icon: Instagram },
  { href: "#", label: "LinkedIn", icon: Linkedin },
  { href: "#", label: "X (Twitter)", icon: Twitter },
  { href: "#", label: "YouTube", icon: Youtube },
];

export function Footer() {
  return (
    <footer className="bg-navy-900 text-cream-200" role="contentinfo">
      {/* Main Footer */}
      <div className="section-container py-16 lg:py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">

          {/* Brand Column */}
          <div className="lg:col-span-1">
            <Link href="/" className="inline-flex flex-col mb-6">
              <span className="font-display text-3xl font-light text-cream-100 tracking-wide">
                Prestige
              </span>
              <span className="text-gold-500 text-xs tracking-[0.3em] uppercase font-semibold -mt-1">
                Properties
              </span>
            </Link>
            <p className="text-sm text-cream-400 leading-relaxed mb-6 max-w-xs">
              Connecting discerning buyers and renters with exceptional properties
              across the region. Trusted excellence since 2012.
            </p>

            {/* Contact Info */}
            <div className="space-y-3 text-sm">
              <a
                href="tel:+1234567890"
                className="flex items-center gap-3 text-cream-300 hover:text-gold-400 transition-colors"
              >
                <Phone size={15} className="text-gold-500 shrink-0" />
                +1 (234) 567-8900
              </a>
              <a
                href="mailto:info@prestigeproperties.com"
                className="flex items-center gap-3 text-cream-300 hover:text-gold-400 transition-colors"
              >
                <Mail size={15} className="text-gold-500 shrink-0" />
                info@prestigeproperties.com
              </a>
              <div className="flex items-start gap-3 text-cream-300">
                <MapPin size={15} className="text-gold-500 shrink-0 mt-0.5" />
                <span>123 Business District, Suite 400<br />Kampala, Uganda</span>
              </div>
            </div>
          </div>

          {/* Properties Column */}
          <div>
            <h3 className="text-cream-100 font-semibold text-sm tracking-widest uppercase mb-5">
              Properties
            </h3>
            <ul className="space-y-3">
              {propertyLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="flex items-center gap-2 text-sm text-cream-400 hover:text-gold-400 transition-colors group"
                  >
                    <ArrowRight
                      size={12}
                      className="opacity-0 group-hover:opacity-100 -ml-2 group-hover:ml-0 transition-all duration-200"
                    />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Column */}
          <div>
            <h3 className="text-cream-100 font-semibold text-sm tracking-widest uppercase mb-5">
              Company
            </h3>
            <ul className="space-y-3">
              {companyLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="flex items-center gap-2 text-sm text-cream-400 hover:text-gold-400 transition-colors group"
                  >
                    <ArrowRight
                      size={12}
                      className="opacity-0 group-hover:opacity-100 -ml-2 group-hover:ml-0 transition-all duration-200"
                    />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter Column */}
          <div>
            <h3 className="text-cream-100 font-semibold text-sm tracking-widest uppercase mb-5">
              Stay Updated
            </h3>
            <p className="text-sm text-cream-400 mb-4 leading-relaxed">
              Get the latest property listings, market insights, and exclusive
              deals delivered to your inbox.
            </p>
            <NewsletterForm />
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-white/10" />

      {/* Bottom Footer */}
      <div className="section-container py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Copyright */}
          <p className="text-xs text-cream-500 order-2 sm:order-1">
            © {new Date().getFullYear()} Prestige Properties. All rights reserved.
          </p>

          {/* Legal Links */}
          <nav aria-label="Legal navigation" className="flex items-center gap-4 order-1 sm:order-2">
            {legalLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-xs text-cream-500 hover:text-gold-400 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Social Links */}
          <div className="flex items-center gap-3 order-3">
            {socialLinks.map(({ href, label, icon: Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="p-1.5 rounded-lg text-cream-500 hover:text-gold-400 hover:bg-white/5 transition-all duration-200"
              >
                <Icon size={16} />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
