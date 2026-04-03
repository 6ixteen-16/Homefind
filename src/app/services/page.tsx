import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { prisma } from "@/lib/prisma";
import {
  Home, Building2, Wrench, BarChart3, Scale, TrendingUp, ArrowRight, Plus
} from "lucide-react";

export const metadata: Metadata = {
  title: "Our Services",
  description:
    "Comprehensive real estate services — property sales, rentals, management, valuations, and investment advisory from Prestige Properties.",
};

export const revalidate = 3600;

const SERVICES = [
  {
    icon: Home,
    title: "Property Sales",
    desc: "Expert guidance through every step of buying or selling residential and commercial property. We handle negotiations, paperwork, and due diligence so you don't have to.",
    features: ["Free property valuation", "Marketing on all major platforms", "Negotiation support", "Legal documentation assistance"],
    cta: "Find Properties for Sale",
    href: "/properties?listingType=SALE",
  },
  {
    icon: Building2,
    title: "Rentals & Lettings",
    desc: "Whether you're a tenant searching for the perfect rental or a landlord looking to lease your property, our team makes the process fast and stress-free.",
    features: ["Tenant screening & vetting", "Lease agreement preparation", "Rent collection support", "Move-in / move-out inspections"],
    cta: "Browse Rentals",
    href: "/properties?listingType=RENT",
  },
  {
    icon: Wrench,
    title: "Property Management",
    desc: "Full-service property management for landlords. We handle everything from tenant relations to maintenance coordination, maximising your return on investment.",
    features: ["Monthly rent collection", "Maintenance coordination", "Regular property inspections", "Financial reporting"],
    cta: "Learn More",
    href: "/contact?subject=property-management",
  },
  {
    icon: BarChart3,
    title: "Valuations",
    desc: "Accurate, professionally prepared property valuations for sales, rentals, insurance, estate planning, and financing purposes.",
    features: ["Market comparison analysis", "Written valuation certificate", "Turnaround in 48–72 hours", "RICS-compliant methodology"],
    cta: "Request a Valuation",
    href: "/contact?subject=valuation",
  },
  {
    icon: TrendingUp,
    title: "Investment Advisory",
    desc: "Strategic property investment guidance for individuals and institutional investors. We identify high-yield opportunities aligned with your financial goals.",
    features: ["Portfolio analysis", "ROI projections", "Market trend reports", "Off-market opportunities"],
    cta: "Talk to an Advisor",
    href: "/contact?subject=investment",
  },
  {
    icon: Scale,
    title: "Legal & Documentation",
    desc: "We work with trusted legal partners to handle all documentation — from title searches to sale agreements — ensuring your transaction is watertight.",
    features: ["Title search & verification", "Sale agreement drafting", "Transfer documentation", "Legal fee estimates"],
    cta: "Get in Touch",
    href: "/contact?subject=legal",
  },
];

export default async function ServicesPage() {
  const faqs = await prisma.fAQ.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  }).catch(() => []);

  return (
    <>
      <Navbar />
      <main id="main-content">

        {/* Header */}
        <section className="bg-navy-900 py-20 lg:py-28">
          <div className="section-container">
            <nav aria-label="Breadcrumb" className="mb-6">
              <ol className="flex items-center gap-2 text-xs text-cream-500">
                <li><Link href="/" className="hover:text-gold-400 transition-colors">Home</Link></li>
                <li>/</li>
                <li className="text-cream-200" aria-current="page">Services</li>
              </ol>
            </nav>
            <span className="eyebrow block mb-3 text-gold-400">What We Offer</span>
            <h1 className="font-display text-display-xl font-light text-cream-100 mb-4">
              Full-Service Real Estate
            </h1>
            <p className="text-cream-300 text-lg max-w-2xl leading-relaxed">
              From your first property search to long-term portfolio management —
              Prestige Properties provides end-to-end real estate solutions.
            </p>
          </div>
        </section>

        {/* Services Grid */}
        <section className="section-padding bg-background" aria-labelledby="services-heading">
          <div className="section-container">
            <div className="sr-only" id="services-heading">Our services</div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {SERVICES.map(({ icon: Icon, title, desc, features, cta, href }) => (
                <div
                  key={title}
                  className="bg-card rounded-2xl border border-border p-6 shadow-luxury hover:shadow-luxury-lg hover:-translate-y-1 transition-all duration-300 flex flex-col"
                >
                  <div className="w-12 h-12 rounded-xl bg-navy-900 flex items-center justify-center mb-5">
                    <Icon size={22} className="text-gold-500" />
                  </div>
                  <h2 className="font-display text-xl font-light text-foreground mb-3">{title}</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-5">{desc}</p>
                  <ul className="space-y-2 mb-6 flex-1">
                    {features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm text-foreground">
                        <span className="w-1.5 h-1.5 rounded-full bg-gold-500 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={href}
                    className="flex items-center gap-2 text-sm font-semibold text-gold-600 hover:text-gold-700 transition-colors group mt-auto"
                  >
                    {cta}
                    <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        {faqs.length > 0 && (
          <section className="section-padding bg-cream-100 dark:bg-navy-950/40" aria-labelledby="faq-heading">
            <div className="section-container max-w-3xl">
              <div className="text-center mb-12">
                <span className="eyebrow block mb-3">Common Questions</span>
                <h2 id="faq-heading" className="font-display text-display-md font-light text-foreground">
                  Frequently Asked Questions
                </h2>
              </div>
              <div className="space-y-3">
                {faqs.map((faq) => (
                  <details
                    key={faq.id}
                    className="group bg-card border border-border rounded-xl overflow-hidden shadow-luxury"
                  >
                    <summary className="flex items-center justify-between px-6 py-4 cursor-pointer list-none font-semibold text-foreground hover:text-gold-600 transition-colors">
                      {faq.question}
                      <Plus
                        size={18}
                        className="shrink-0 text-gold-500 transition-transform duration-200 group-open:rotate-45"
                      />
                    </summary>
                    <div
                      className="px-6 pb-5 text-sm text-muted-foreground leading-relaxed border-t border-border pt-4"
                      dangerouslySetInnerHTML={{ __html: faq.answer }}
                    />
                  </details>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* CTA */}
        <section className="section-padding bg-navy-900">
          <div className="section-container text-center">
            <h2 className="font-display text-display-md font-light text-cream-100 mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-cream-300 max-w-xl mx-auto mb-8">
              Contact our team today and let us match you with the right service for your needs.
            </p>
            <Link href="/contact" className="btn-gold">
              Contact Us <ArrowRight size={16} />
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
