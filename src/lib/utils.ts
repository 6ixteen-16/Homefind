import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import slugify from "slugify";

// ============================================================
// TAILWIND MERGE
// ============================================================
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ============================================================
// FORMATTING
// ============================================================
export function formatPrice(
  price: number,
  currency: string = "USD",
  compact: boolean = false
): string {
  if (compact) {
    if (price >= 1_000_000) {
      return `${(price / 1_000_000).toFixed(1)}M ${currency}`;
    }
    if (price >= 1_000) {
      return `${(price / 1_000).toFixed(0)}K ${currency}`;
    }
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(price);
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

export function formatDate(date: Date | string, style: "short" | "long" | "relative" = "short"): string {
  const d = typeof date === "string" ? new Date(date) : date;

  if (style === "relative") {
    const diff = Date.now() - d.getTime();
    const minutes = Math.floor(diff / 60_000);
    const hours = Math.floor(diff / 3_600_000);
    const days = Math.floor(diff / 86_400_000);
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
  }

  if (style === "long") {
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatSqft(sqft: number | null | undefined): string {
  if (!sqft) return "N/A";
  return `${formatNumber(sqft)} sqft`;
}

// ============================================================
// SLUG GENERATION
// ============================================================
export function generateSlug(text: string): string {
  return slugify(text, {
    lower: true,
    strict: true,
    trim: true,
    replacement: "-",
  });
}

// ============================================================
// PROPERTY HELPERS
// ============================================================
export function getListingTypeBadge(type: "SALE" | "RENT"): {
  label: string;
  className: string;
} {
  return type === "SALE"
    ? { label: "For Sale", className: "badge-sale" }
    : { label: "For Rent", className: "badge-rent" };
}

export function getStatusLabel(status: string): { label: string; className: string } {
  const map: Record<string, { label: string; className: string }> = {
    DRAFT:       { label: "Draft",       className: "bg-gray-100 text-gray-600" },
    PUBLISHED:   { label: "Available",   className: "bg-green-100 text-green-700" },
    UNDER_OFFER: { label: "Under Offer", className: "bg-amber-100 text-amber-700" },
    SOLD:        { label: "Sold",        className: "bg-red-100 text-red-700" },
    RENTED:      { label: "Rented",      className: "bg-blue-100 text-blue-700" },
    ARCHIVED:    { label: "Archived",    className: "bg-slate-100 text-slate-600" },
  };
  return map[status] || { label: status, className: "bg-gray-100 text-gray-600" };
}

export function getInquiryStatusConfig(status: string): {
  label: string;
  className: string;
} {
  const map: Record<string, { label: string; className: string }> = {
    NEW:             { label: "New",            className: "status-new" },
    IN_PROGRESS:     { label: "In Progress",    className: "status-progress" },
    AWAITING_CLIENT: { label: "Awaiting Client",className: "status-awaiting" },
    CLOSED_WON:      { label: "Closed — Won",   className: "status-won" },
    CLOSED_LOST:     { label: "Closed — Lost",  className: "status-lost" },
    SPAM:            { label: "Spam",           className: "status-spam" },
  };
  return map[status] || { label: status, className: "status-new" };
}

// ============================================================
// CLOUDINARY HELPERS
// ============================================================
export function cloudinaryUrl(
  publicId: string,
  options: {
    width?: number;
    height?: number;
    quality?: string;
    format?: string;
    crop?: string;
    gravity?: string;
  } = {}
): string {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  if (!cloudName) return publicId;

  const transforms = [];
  if (options.width) transforms.push(`w_${options.width}`);
  if (options.height) transforms.push(`h_${options.height}`);
  if (options.quality) transforms.push(`q_${options.quality}`);
  if (options.format) transforms.push(`f_${options.format}`);
  if (options.crop) transforms.push(`c_${options.crop}`);
  if (options.gravity) transforms.push(`g_${options.gravity}`);

  const transform = transforms.join(",");
  const base = `https://res.cloudinary.com/${cloudName}/image/upload`;

  if (transform) {
    return `${base}/${transform}/${publicId}`;
  }
  return `${base}/${publicId}`;
}

// ============================================================
// PAGINATION
// ============================================================
export function buildPaginationMeta(
  total: number,
  page: number,
  pageSize: number
) {
  const totalPages = Math.ceil(total / pageSize);
  return {
    total,
    page,
    pageSize,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}

// ============================================================
// URL PARAMS
// ============================================================
export function buildQueryString(params: Record<string, string | number | boolean | undefined | null>): string {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "" && value !== false) {
      sp.set(key, String(value));
    }
  }
  const str = sp.toString();
  return str ? `?${str}` : "";
}

// ============================================================
// VALIDATION
// ============================================================
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength).trim() + "…";
}

// ============================================================
// READING TIME
// ============================================================
export function readingTime(text: string): number {
  const wordsPerMinute = 225;
  const words = text.trim().split(/\s+/).length;
  return Math.ceil(words / wordsPerMinute);
}

// ============================================================
// CLOUDFLARE TURNSTILE VERIFICATION
// ============================================================
export async function verifyTurnstile(token: string): Promise<boolean> {
  if (process.env.NODE_ENV === "development") return true;

  const secret = process.env.CLOUDFLARE_TURNSTILE_SECRET;
  if (!secret) return true;

  try {
    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret, response: token }),
      }
    );
    const data = await res.json();
    return data.success === true;
  } catch {
    return false;
  }
}

// ============================================================
// RATE LIMITING HELPER
// ============================================================
export function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "127.0.0.1"
  );
}
