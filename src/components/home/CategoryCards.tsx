import Link from "next/link";
import { Home, Building2, Layers, Trees } from "lucide-react";

const CATEGORIES = [
  {
    icon: Home,
    label: "Residential",
    desc: "Apartments, villas & townhouses",
    href: "/properties?category=RESIDENTIAL",
    gradient: "from-blue-600/20 to-blue-400/10",
    iconColor: "text-blue-500",
  },
  {
    icon: Building2,
    label: "Commercial",
    desc: "Offices, warehouses & retail",
    href: "/properties?category=COMMERCIAL",
    gradient: "from-amber-600/20 to-amber-400/10",
    iconColor: "text-amber-500",
  },
  {
    icon: Trees,
    label: "Land & Plots",
    desc: "Development & investment land",
    href: "/properties?category=LAND",
    gradient: "from-green-600/20 to-green-400/10",
    iconColor: "text-green-500",
  },
  {
    icon: Layers,
    label: "Short Stay",
    desc: "Furnished & holiday rentals",
    href: "/properties?category=SHORT_STAY",
    gradient: "from-purple-600/20 to-purple-400/10",
    iconColor: "text-purple-500",
  },
];

export function CategoryCards() {
  return (
    <section className="section-padding bg-cream-100 dark:bg-navy-950/40" aria-labelledby="categories-heading">
      <div className="section-container">
        <div className="text-center mb-12">
          <span className="eyebrow block mb-3">Browse By Type</span>
          <h2 id="categories-heading" className="font-display text-display-md font-light text-foreground">
            Find Your Category
          </h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {CATEGORIES.map(({ icon: Icon, label, desc, href, gradient, iconColor }) => (
            <Link
              key={label}
              href={href}
              className={`group relative bg-gradient-to-br ${gradient} rounded-2xl p-6 border border-border hover:border-gold-500/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-luxury`}
            >
              <div className={`${iconColor} mb-4`}>
                <Icon size={32} />
              </div>
              <h3 className="font-display text-xl font-light text-foreground mb-1">{label}</h3>
              <p className="text-xs text-muted-foreground">{desc}</p>
              <div className="absolute bottom-4 right-4 w-6 h-6 rounded-full border border-gold-500/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-gold-500 text-xs">→</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
