import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ContactForm } from "@/components/shared/ContactForm";
import { Phone, Mail, MapPin, Clock, Facebook, Instagram, Linkedin, Twitter } from "lucide-react";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Get in touch with Prestige Properties. We're here to help you find your perfect property.",
};

const CONTACT_INFO = [
  { icon: Phone, label: "Phone", value: "+1 (234) 567-8900", href: "tel:+1234567890" },
  { icon: Mail, label: "Email", value: "info@prestigeproperties.com", href: "mailto:info@prestigeproperties.com" },
  { icon: MapPin, label: "Address", value: "123 Business District, Suite 400, Kampala, Uganda", href: null },
  { icon: Clock, label: "Hours", value: "Mon–Fri: 9am–6pm · Sat: 10am–3pm", href: null },
];

export default function ContactPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: "Prestige Properties",
    telephone: "+1234567890",
    email: "info@prestigeproperties.com",
    address: {
      "@type": "PostalAddress",
      streetAddress: "123 Business District, Suite 400",
      addressLocality: "Kampala",
      addressCountry: "UG",
    },
    openingHours: ["Mo-Fr 09:00-18:00", "Sa 10:00-15:00"],
    url: process.env.NEXT_PUBLIC_SITE_URL,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Navbar />
      <main id="main-content">
        {/* Header */}
        <section className="bg-navy-900 py-20">
          <div className="section-container">
            <nav aria-label="Breadcrumb" className="mb-6">
              <ol className="flex items-center gap-2 text-xs text-cream-500">
                <li><Link href="/" className="hover:text-gold-400 transition-colors">Home</Link></li>
                <li>/</li>
                <li className="text-cream-200" aria-current="page">Contact Us</li>
              </ol>
            </nav>
            <span className="eyebrow block mb-3 text-gold-400">Get in Touch</span>
            <h1 className="font-display text-display-xl font-light text-cream-100 mb-4">
              We&apos;d Love to Hear From You
            </h1>
            <p className="text-cream-300 max-w-xl text-lg">
              Whether you have a question about a listing, want to schedule a viewing, or are ready
              to list your property — our team is ready to help.
            </p>
          </div>
        </section>

        {/* Content */}
        <section className="section-padding bg-background">
          <div className="section-container">
            <div className="grid lg:grid-cols-2 gap-16">
              {/* Contact Info */}
              <div>
                <h2 className="font-display text-2xl font-light text-foreground mb-8">Contact Information</h2>
                <div className="space-y-5 mb-10">
                  {CONTACT_INFO.map(({ icon: Icon, label, value, href }) => (
                    <div key={label} className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-navy-900 flex items-center justify-center shrink-0">
                        <Icon size={18} className="text-gold-500" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-0.5">{label}</div>
                        {href ? (
                          <a href={href} className="text-foreground hover:text-gold-600 transition-colors">{value}</a>
                        ) : (
                          <span className="text-foreground">{value}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Social */}
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-4">Follow Us</h3>
                  <div className="flex items-center gap-3">
                    {[
                      { icon: Facebook, href: "#", label: "Facebook" },
                      { icon: Instagram, href: "#", label: "Instagram" },
                      { icon: Linkedin, href: "#", label: "LinkedIn" },
                      { icon: Twitter, href: "#", label: "X (Twitter)" },
                    ].map(({ icon: Icon, href, label }) => (
                      <a
                        key={label}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={label}
                        className="w-10 h-10 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:border-gold-500/40 hover:text-gold-600 hover:bg-gold-500/5 transition-all"
                      >
                        <Icon size={18} />
                      </a>
                    ))}
                  </div>
                </div>

                {/* Embedded Map */}
                <div className="mt-10 rounded-2xl overflow-hidden border border-border h-64 bg-muted">
                  <iframe
                    src="https://www.openstreetmap.org/export/embed.html?bbox=32.5727%2C0.3122%2C32.5927%2C0.3522&layer=mapnik&marker=0.3322%2C32.5827"
                    title="Office location on map"
                    className="w-full h-full"
                    loading="lazy"
                  />
                </div>
              </div>

              {/* Contact Form */}
              <div className="bg-card rounded-2xl border border-border shadow-luxury p-8">
                <h2 className="font-display text-2xl font-light text-foreground mb-2">Send Us a Message</h2>
                <p className="text-sm text-muted-foreground mb-6">
                  Fill out the form below and we&apos;ll get back to you within one business day.
                </p>
                <ContactForm />
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
