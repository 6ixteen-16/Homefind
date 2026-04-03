import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { prisma } from "@/lib/prisma";
import { Mail, Phone, Linkedin, Instagram, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "About Us",
  description: "Learn about Prestige Properties — our story, team, values, and commitment to exceptional real estate service.",
};

export const revalidate = 3600;

const MILESTONES = [
  { year: "2012", title: "Founded", desc: "Prestige Properties was established with a vision to redefine real estate in the region." },
  { year: "2015", title: "100th Sale", desc: "Reached our 100th successful property sale, a testament to our growing reputation." },
  { year: "2018", title: "Expanded Services", desc: "Launched full property management and investment advisory services." },
  { year: "2021", title: "Digital Platform", desc: "Launched our industry-leading digital property search platform." },
  { year: "2024", title: "500+ Properties", desc: "Surpassed 500 active property listings across 24 cities." },
];

const VALUES = [
  { emoji: "🤝", title: "Integrity", desc: "We conduct every transaction with complete transparency and honesty." },
  { emoji: "🎯", title: "Excellence", desc: "We hold ourselves to the highest standards in everything we do." },
  { emoji: "💡", title: "Innovation", desc: "We constantly seek better ways to serve our clients." },
  { emoji: "🌍", title: "Community", desc: "We invest in the communities where we work and live." },
];

export default async function AboutPage() {
  const team = await prisma.teamMember.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  }).catch(() => []);

  return (
    <>
      <Navbar />
      <main id="main-content">
        {/* Hero */}
        <section className="bg-navy-900 py-20 lg:py-28">
          <div className="section-container">
            <nav aria-label="Breadcrumb" className="mb-6">
              <ol className="flex items-center gap-2 text-xs text-cream-500">
                <li><Link href="/" className="hover:text-gold-400 transition-colors">Home</Link></li>
                <li>/</li>
                <li className="text-cream-200" aria-current="page">About Us</li>
              </ol>
            </nav>
            <div className="max-w-3xl">
              <span className="eyebrow block mb-4 text-gold-400">Our Story</span>
              <h1 className="font-display text-display-xl font-light text-cream-100 mb-6">
                Built on Trust.<br />
                <span className="italic text-gold-400">Driven by Excellence.</span>
              </h1>
              <p className="text-cream-300 text-lg leading-relaxed max-w-2xl">
                For over a decade, Prestige Properties has been the trusted partner for buyers, sellers,
                and investors seeking exceptional real estate across the region. We combine deep market
                expertise with a genuine commitment to every client's success.
              </p>
            </div>
          </div>
        </section>

        {/* Mission & Vision */}
        <section className="section-padding bg-background">
          <div className="section-container">
            <div className="grid lg:grid-cols-2 gap-12">
              <div className="bg-navy-900 rounded-2xl p-8 lg:p-10">
                <div className="text-gold-500 text-4xl mb-4">◈</div>
                <h2 className="font-display text-2xl font-light text-cream-100 mb-4">Our Mission</h2>
                <p className="text-cream-300 leading-relaxed">
                  To connect every client with their perfect property through expert guidance,
                  transparent service, and an unwavering commitment to their best interests —
                  making the complex simple and the exceptional attainable.
                </p>
              </div>
              <div className="bg-gold-500/5 border border-gold-500/20 rounded-2xl p-8 lg:p-10">
                <div className="text-gold-500 text-4xl mb-4">◇</div>
                <h2 className="font-display text-2xl font-light text-foreground mb-4">Our Vision</h2>
                <p className="text-muted-foreground leading-relaxed">
                  To be the most trusted real estate firm in East Africa, recognised for transforming
                  lives through property — whether it's a family finding their forever home or an
                  investor building generational wealth.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Company History Timeline */}
        <section className="section-padding bg-cream-100 dark:bg-navy-950/40">
          <div className="section-container">
            <div className="text-center mb-16">
              <span className="eyebrow block mb-3">Our Journey</span>
              <h2 className="font-display text-display-md font-light text-foreground">Company Milestones</h2>
            </div>
            <div className="relative max-w-3xl mx-auto">
              {/* Vertical line */}
              <div className="absolute left-8 lg:left-1/2 top-0 bottom-0 w-px bg-gold-500/30" aria-hidden="true" />

              <div className="space-y-10">
                {MILESTONES.map((m, i) => (
                  <div key={m.year} className={`flex gap-6 lg:gap-0 ${i % 2 === 0 ? "lg:flex-row" : "lg:flex-row-reverse"}`}>
                    <div className={`flex-1 ${i % 2 === 0 ? "lg:pr-12 lg:text-right" : "lg:pl-12"} pl-16 lg:pl-0`}>
                      <div className="bg-card rounded-xl p-5 border border-border shadow-luxury inline-block w-full lg:w-auto">
                        <div className="text-gold-500 font-mono font-semibold text-sm mb-1">{m.year}</div>
                        <div className="font-semibold text-foreground mb-1">{m.title}</div>
                        <div className="text-sm text-muted-foreground">{m.desc}</div>
                      </div>
                    </div>
                    {/* Dot */}
                    <div className="absolute left-6 lg:left-1/2 lg:-translate-x-1/2 w-5 h-5 rounded-full bg-gold-500 border-4 border-background shadow-gold flex-shrink-0" style={{ top: `${i * 120 + 24}px` }} aria-hidden="true" />
                    <div className="flex-1 hidden lg:block" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Core Values */}
        <section className="section-padding bg-background">
          <div className="section-container">
            <div className="text-center mb-12">
              <span className="eyebrow block mb-3">What We Stand For</span>
              <h2 className="font-display text-display-md font-light text-foreground">Core Values</h2>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {VALUES.map(({ emoji, title, desc }) => (
                <div key={title} className="text-center p-6 rounded-2xl border border-border hover:border-gold-500/30 hover:shadow-luxury transition-all duration-300">
                  <div className="text-5xl mb-4">{emoji}</div>
                  <h3 className="font-display text-xl font-light text-foreground mb-2">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Team */}
        {team.length > 0 && (
          <section id="team" className="section-padding bg-cream-100 dark:bg-navy-950/40">
            <div className="section-container">
              <div className="text-center mb-12">
                <span className="eyebrow block mb-3">Meet The Team</span>
                <h2 className="font-display text-display-md font-light text-foreground">Our Experts</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {team.map((member) => (
                  <div key={member.id} className="bg-card rounded-2xl overflow-hidden border border-border shadow-luxury group hover:-translate-y-1 transition-all duration-300">
                    <div className="relative h-56 bg-gradient-luxury overflow-hidden">
                      {member.photo ? (
                        <Image src={member.photo} alt={member.name} fill className="object-cover" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="font-display text-6xl font-light text-gold-400">
                            {member.name.split(" ").map((n) => n[0]).join("")}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="p-5">
                      <h3 className="font-semibold text-foreground">{member.name}</h3>
                      <p className="text-sm text-gold-600 mb-2">{member.title}</p>
                      {member.bio && (
                        <p className="text-xs text-muted-foreground leading-relaxed mb-4 line-clamp-3">
                          {member.bio}
                        </p>
                      )}
                      <div className="flex items-center gap-2">
                        {member.phone && (
                          <a href={`tel:${member.phone}`} aria-label={`Call ${member.name}`}
                            className="p-1.5 rounded-lg bg-muted hover:bg-gold-500/10 text-muted-foreground hover:text-gold-600 transition-colors">
                            <Phone size={14} />
                          </a>
                        )}
                        {member.email && (
                          <a href={`mailto:${member.email}`} aria-label={`Email ${member.name}`}
                            className="p-1.5 rounded-lg bg-muted hover:bg-gold-500/10 text-muted-foreground hover:text-gold-600 transition-colors">
                            <Mail size={14} />
                          </a>
                        )}
                        {member.linkedin && (
                          <a href={member.linkedin} target="_blank" rel="noopener noreferrer" aria-label={`${member.name} on LinkedIn`}
                            className="p-1.5 rounded-lg bg-muted hover:bg-gold-500/10 text-muted-foreground hover:text-gold-600 transition-colors">
                            <Linkedin size={14} />
                          </a>
                        )}
                        {member.instagram && (
                          <a href={member.instagram} target="_blank" rel="noopener noreferrer" aria-label={`${member.name} on Instagram`}
                            className="p-1.5 rounded-lg bg-muted hover:bg-gold-500/10 text-muted-foreground hover:text-gold-600 transition-colors">
                            <Instagram size={14} />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* CTA */}
        <section className="section-padding bg-navy-900">
          <div className="section-container text-center">
            <h2 className="font-display text-display-md font-light text-cream-100 mb-4">
              Ready to Work With Us?
            </h2>
            <p className="text-cream-300 max-w-xl mx-auto mb-8">
              Whether you're buying, selling, renting, or investing — our team is ready to guide you.
            </p>
            <Link href="/contact" className="btn-gold">
              Get in Touch <ArrowRight size={16} />
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
