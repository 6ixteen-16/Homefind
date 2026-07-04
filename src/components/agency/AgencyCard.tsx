import Link from "next/link";
import Image from "next/image";
import { MapPin, Building2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Agency {
  id: string;
  name: string;
  logoUrl?: string | null;
  address?: string | null;
  verifiedStatus?: boolean;
  _count: {
    properties: number;
  };
}

export function AgencyCard({ agency }: { agency: Agency }) {
  return (
    <Link
      href={`/agencies/${agency.id}`}
      className="group bg-card rounded-2xl border border-border shadow-luxury overflow-hidden hover:border-gold-500/30 transition-all duration-500"
    >
      <div className="p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center overflow-hidden border border-border shrink-0 group-hover:border-gold-500/20 transition-colors">
            {agency.logoUrl ? (
              <Image
                src={agency.logoUrl}
                alt={agency.name}
                width={64}
                height={64}
                className="object-contain w-full h-full p-2"
              />
            ) : (
              <Building2 className="text-muted-foreground w-8 h-8" />
            )}
          </div>
          {agency.verifiedStatus && (
            <div className="bg-gold-500/10 text-gold-600 dark:text-gold-400 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full border border-gold-500/20 flex items-center gap-1">
              <CheckCircle2 size={10} />
              Verified
            </div>
          )}
        </div>

        <h3 className="font-display text-lg font-light text-foreground group-hover:text-gold-600 transition-colors mb-2">
          {agency.name}
        </h3>

        {agency.address && (
          <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-4">
            <MapPin size={12} className="text-gold-500 shrink-0" />
            <span className="truncate">{agency.address}</span>
          </div>
        )}

        <div className="pt-4 border-t border-border flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{agency._count.properties}</span> Properties
          </div>
          <span className="text-xs font-semibold text-gold-600 group-hover:translate-x-1 transition-transform">
            View Profile →
          </span>
        </div>
      </div>
    </Link>
  );
}
