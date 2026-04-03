"use client";

import { useEffect, useRef, useState } from "react";
import CountUp from "react-countup";
import { Building2, Users, Award, MapPin } from "lucide-react";

interface StatsProps {
  stats: { properties: number; clients: number; experience: number; cities: number };
}

const statItems = [
  { key: "properties" as const, label: "Properties Listed", icon: Building2, suffix: "+" },
  { key: "clients" as const, label: "Happy Clients", icon: Users, suffix: "+" },
  { key: "experience" as const, label: "Years Experience", icon: Award, suffix: "" },
  { key: "cities" as const, label: "Cities Covered", icon: MapPin, suffix: "" },
];

export function StatsSection({ stats }: StatsProps) {
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setStarted(true); },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={ref} className="bg-navy-900 py-14" aria-label="Company statistics">
      <div className="section-container">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {statItems.map(({ key, label, icon: Icon, suffix }) => (
            <div key={key} className="stat-card text-center">
              <Icon size={24} className="text-gold-500 mx-auto mb-3" aria-hidden="true" />
              <div className="font-display text-4xl font-light text-cream-100 mb-1">
                {started ? (
                  <CountUp end={stats[key]} duration={2.5} separator="," />
                ) : (
                  0
                )}
                {suffix}
              </div>
              <div className="text-cream-400 text-sm">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
