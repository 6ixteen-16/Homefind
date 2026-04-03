import Link from "next/link";
import { Shield, Eye, Headphones, BadgeCheck, Search, Phone, Key, ArrowRight, Calendar } from "lucide-react";
import Image from "next/image";
import { formatDate } from "@/lib/utils";

// ============================================================
// WHY CHOOSE US
// ============================================================
const USPs = [
  {
    icon: BadgeCheck,
    title: "Verified Listings",
    desc: "Every property is physically inspected and verified by our team before listing.",
  },
  {
    icon: Shield,
    title: "Trusted & Secure",
    desc: "Fully licensed agency with 12 years of proven track record in the market.",
  },
  {
    icon: Eye,
    title: "Transparent Pricing",
    desc: "No hidden fees. What you see is what you pay, with full financial clarity.",
  },
  {
    icon: Headphones,
    title: "End-to-End Support",
    desc: "From first viewing to final paperwork, our experts guide every step.",
  },
];

export function WhyChooseUs() {
  return (
    <section className="section-padding bg-background" aria-labelledby="why-heading">
      <div className="section-container">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <span className="eyebrow block mb-3">Why Work With Us</span>
            <h2 id="why-heading" className="font-display text-display-md font-light text-foreground mb-6">
              The Prestige Difference
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-10 max-w-md">
              We've built our reputation on integrity, expertise, and a genuine commitment
              to matching every client with their perfect property — not just any property.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {USPs.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gold-500/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Icon size={18} className="text-gold-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-sm mb-1">{title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <Link href="/about" className="btn-navy mt-10 inline-flex">
              Learn About Us <ArrowRight size={16} />
            </Link>
          </div>

          {/* Visual */}
          <div className="relative hidden lg:block">
            <div className="aspect-[4/5] rounded-2xl overflow-hidden bg-gradient-luxury shadow-luxury-xl">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-cream-200 px-8">
                  <div className="font-display text-6xl font-light text-gold-400 mb-2">12+</div>
                  <div className="text-sm tracking-widest uppercase">Years of Excellence</div>
                </div>
              </div>
            </div>
            {/* Floating cards */}
            <div className="absolute -bottom-6 -left-6 bg-card rounded-xl p-4 shadow-luxury-lg border border-border">
              <div className="text-2xl font-display font-light text-navy-900 dark:text-cream-100">500+</div>
              <div className="text-xs text-muted-foreground">Properties Sold</div>
            </div>
            <div className="absolute -top-6 -right-6 bg-gold-500 rounded-xl p-4 shadow-gold">
              <div className="text-2xl font-display font-light text-navy-900">98%</div>
              <div className="text-xs text-navy-700">Client Satisfaction</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================
// HOW IT WORKS
// ============================================================
const STEPS = [
  {
    icon: Search,
    step: "01",
    title: "Search & Filter",
    desc: "Use our powerful search to find properties matching your exact requirements — location, budget, size, and more.",
  },
  {
    icon: Phone,
    step: "02",
    title: "Connect with an Agent",
    desc: "Submit an inquiry and our experienced agents will contact you within 24 hours to arrange a viewing.",
  },
  {
    icon: Key,
    step: "03",
    title: "Move In",
    desc: "We handle all documentation, negotiations, and legalities so you can focus on your new home.",
  },
];

export function HowItWorks() {
  return (
    <section className="section-padding bg-navy-900" aria-labelledby="how-heading">
      <div className="section-container text-center">
        <span className="eyebrow block mb-3 text-gold-400">Simple Process</span>
        <h2 id="how-heading" className="font-display text-display-md font-light text-cream-100 mb-4">
          How It Works
        </h2>
        <p className="text-cream-400 max-w-xl mx-auto mb-16">
          Finding your perfect property is easier than you think. Just three simple steps.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Connecting line */}
          <div className="hidden md:block absolute top-10 left-1/3 right-1/3 h-px bg-gradient-to-r from-gold-500/30 via-gold-500 to-gold-500/30" aria-hidden="true" />

          {STEPS.map(({ icon: Icon, step, title, desc }) => (
            <div key={step} className="flex flex-col items-center text-center gap-4">
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl bg-gold-500/10 border border-gold-500/30 flex items-center justify-center">
                  <Icon size={32} className="text-gold-500" />
                </div>
                <span className="absolute -top-2 -right-2 bg-gold-500 text-navy-900 text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                  {step}
                </span>
              </div>
              <h3 className="font-display text-xl font-light text-cream-100">{title}</h3>
              <p className="text-cream-400 text-sm leading-relaxed max-w-xs">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================
// TESTIMONIALS
// ============================================================
interface Testimonial {
  id: string;
  clientName: string;
  clientTitle?: string | null;
  clientPhoto?: string | null;
  rating: number;
  text: string;
}

export function TestimonialsSection({ testimonials }: { testimonials: Testimonial[] }) {
  return (
    <section className="section-padding bg-cream-100 dark:bg-navy-950/40 overflow-hidden" aria-labelledby="testimonials-heading">
      <div className="section-container">
        <div className="text-center mb-12">
          <span className="eyebrow block mb-3">Client Stories</span>
          <h2 id="testimonials-heading" className="font-display text-display-md font-light text-foreground">
            What Our Clients Say
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.slice(0, 6).map((t) => (
            <div key={t.id} className="bg-card rounded-2xl p-6 border border-border shadow-luxury">
              {/* Stars */}
              <div className="flex gap-1 mb-4" aria-label={`${t.rating} out of 5 stars`}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i} className={i < t.rating ? "text-gold-500" : "text-muted/30"} aria-hidden="true">★</span>
                ))}
              </div>
              <p className="text-foreground/80 text-sm leading-relaxed mb-5 italic">
                &ldquo;{t.text}&rdquo;
              </p>
              <div className="flex items-center gap-3">
                {t.clientPhoto ? (
                  <Image src={t.clientPhoto} alt={t.clientName} width={40} height={40} className="rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gold-500/20 flex items-center justify-center font-display text-gold-600">
                    {t.clientName[0]}
                  </div>
                )}
                <div>
                  <div className="font-semibold text-sm text-foreground">{t.clientName}</div>
                  {t.clientTitle && <div className="text-xs text-muted-foreground">{t.clientTitle}</div>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================
// CTA BANNER
// ============================================================
export function CtaBanner() {
  return (
    <section className="section-padding bg-gradient-luxury" aria-labelledby="cta-heading">
      <div className="section-container text-center">
        <span className="eyebrow block mb-3 text-gold-400">Ready to Start?</span>
        <h2 id="cta-heading" className="font-display text-display-md font-light text-cream-100 mb-4">
          Find Your Dream Property Today
        </h2>
        <p className="text-cream-300 max-w-xl mx-auto mb-10">
          Whether you're buying, renting, or investing — our expert team is here to guide you every step of the way.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/properties" className="btn-gold">
            Browse Listings <ArrowRight size={16} />
          </Link>
          <Link href="/contact" className="btn-outline text-cream-200 border-cream-200/40 hover:bg-white/10">
            Contact an Agent
          </Link>
        </div>
      </div>
    </section>
  );
}

// ============================================================
// LATEST BLOG
// ============================================================
interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  coverImageUrl?: string | null;
  publishedAt?: Date | null;
  categories: string[];
  readTime?: number | null;
  author: { name: string; photo?: string | null };
}

export function LatestBlog({ posts }: { posts: BlogPost[] }) {
  if (posts.length === 0) return null;

  return (
    <section className="section-padding bg-background" aria-labelledby="blog-heading">
      <div className="section-container">
        <div className="flex items-end justify-between mb-12">
          <div>
            <span className="eyebrow block mb-3">Latest News</span>
            <h2 id="blog-heading" className="font-display text-display-md font-light text-foreground">
              From Our Blog
            </h2>
          </div>
          <Link href="/blog" className="text-sm font-semibold text-gold-600 hover:text-gold-700 transition-colors flex items-center gap-2 group">
            All articles <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {posts.map((post) => (
            <article key={post.id} className="group">
              <Link href={`/blog/${post.slug}`}>
                <div className="aspect-video rounded-xl overflow-hidden bg-muted mb-4">
                  {post.coverImageUrl ? (
                    <Image
                      src={post.coverImageUrl}
                      alt={post.title}
                      width={400}
                      height={225}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-luxury flex items-center justify-center">
                      <span className="text-gold-500 text-4xl font-display">{post.title[0]}</span>
                    </div>
                  )}
                </div>
                {post.categories[0] && (
                  <span className="eyebrow text-2xs mb-2 block">{post.categories[0]}</span>
                )}
                <h3 className="font-display text-xl font-light text-foreground group-hover:text-gold-600 transition-colors line-clamp-2 mb-2">
                  {post.title}
                </h3>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{post.excerpt}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{post.author.name}</span>
                  <span>·</span>
                  {post.publishedAt && <span>{formatDate(post.publishedAt, "short")}</span>}
                  {post.readTime && (
                    <>
                      <span>·</span>
                      <span className="flex items-center gap-1"><Calendar size={11} /> {post.readTime} min read</span>
                    </>
                  )}
                </div>
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
