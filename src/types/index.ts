import type {
  Property,
  PropertyMedia,
  Amenity,
  User,
  Inquiry,
  InquiryNote,
  InquiryReply,
  BlogPost,
  TeamMember,
  Testimonial,
  FAQ,
  AuditLog,
  SiteSettings,
  Role,
  ListingType,
  PropertyCategory,
  PropertyStatus,
  InquiryType,
  InquiryStatus,
  PostStatus,
  MediaType,
} from "@prisma/client";

// Re-export Prisma enums
export type {
  Role,
  ListingType,
  PropertyCategory,
  PropertyStatus,
  InquiryType,
  InquiryStatus,
  PostStatus,
  MediaType,
};

// ============================================================
// PROPERTY TYPES
// ============================================================
export type PropertyWithRelations = Property & {
  agent?: Pick<User, "id" | "name" | "email" | "phone" | "photo"> | null;
  media: PropertyMedia[];
  amenities: Array<{
    amenity: Amenity;
  }>;
  _count?: {
    inquiries: number;
  };
};

export type PropertyCardData = {
  id: string;
  slug: string;
  title: string;
  listingType: ListingType;
  category: PropertyCategory;
  propertyType: string;
  status: PropertyStatus;
  price: number;
  currency: string;
  priceNegotiable: boolean;
  bedrooms: number | null;
  bathrooms: number | null;
  squareFootage: number | null;
  city: string;
  area: string | null;
  country: string;
  latitude: number | null;
  longitude: number | null;
  isFeatured: boolean;
  views: number;
  publishedAt: Date | null;
  createdAt: Date;
  featuredImage: string | null;
  agent?: Pick<User, "id" | "name" | "photo"> | null;
};

// ============================================================
// FILTER & SEARCH TYPES
// ============================================================
export type PropertyFilters = {
  listingType?: "SALE" | "RENT";
  category?: PropertyCategory[];
  propertyType?: string[];
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  bathrooms?: number;
  minSqft?: number;
  maxSqft?: number;
  city?: string;
  area?: string;
  amenities?: string[];
  keywords?: string;
  isFeatured?: boolean;
  status?: PropertyStatus;
  page?: number;
  pageSize?: number;
  sortBy?: "newest" | "oldest" | "price_asc" | "price_desc" | "most_viewed";
  lat?: number;
  lng?: number;
  radiusKm?: number;
  // Map bounds
  swLat?: number;
  swLng?: number;
  neLat?: number;
  neLng?: number;
};

export type PaginationMeta = {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

export type PropertyListResponse = {
  properties: PropertyCardData[];
  meta: PaginationMeta;
};

// ============================================================
// INQUIRY TYPES
// ============================================================
export type InquiryWithRelations = Inquiry & {
  property?: Pick<Property, "id" | "slug" | "title" | "city"> | null;
  assignedTo?: Pick<User, "id" | "name" | "email" | "photo"> | null;
  notes: Array<InquiryNote & { author: Pick<User, "id" | "name" | "photo"> }>;
  replies: Array<InquiryReply & { sentBy: Pick<User, "id" | "name" | "photo"> }>;
};

export type InquirySubmission = {
  type: "PROPERTY" | "GENERAL" | "VIEWING";
  propertyId?: string;
  name: string;
  email: string;
  phone?: string;
  contactMethod?: "email" | "phone" | "whatsapp";
  subject?: string;
  message: string;
  turnstileToken: string;
};

// ============================================================
// BLOG TYPES
// ============================================================
export type BlogPostWithAuthor = BlogPost & {
  author: Pick<User, "id" | "name" | "photo">;
  readTime?: number;
};

// ============================================================
// ADMIN TYPES
// ============================================================
export type AdminDashboardStats = {
  totalListings: number;
  activeListings: number;
  newInquiries: number;
  totalInquiries: number;
  totalViews: number;
  totalAgents: number;
};

export type AuditLogWithUser = AuditLog & {
  user: Pick<User, "id" | "name" | "photo">;
};

// ============================================================
// FORM TYPES
// ============================================================
export type ContactFormData = {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  turnstileToken: string;
};

export type PropertyFormData = Omit<
  Property,
  "id" | "slug" | "createdAt" | "updatedAt" | "views" | "deletedAt"
> & {
  amenityIds: string[];
  mediaIds: string[];
};

// ============================================================
// SITE SETTINGS
// ============================================================
export type { SiteSettings };
export type { TeamMember, Testimonial, FAQ };

// ============================================================
// API RESPONSE TYPES
// ============================================================
export type ApiResponse<T = unknown> =
  | { success: true; data: T; message?: string }
  | { success: false; error: string; details?: unknown };

export type ApiError = {
  error: string;
  details?: unknown;
};

// ============================================================
// MAP TYPES
// ============================================================
export type MapMarker = {
  id: string;
  slug: string;
  title: string;
  price: number;
  currency: string;
  listingType: ListingType;
  lat: number;
  lng: number;
  featuredImage: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
};

// ============================================================
// NEXT-AUTH AUGMENTATION
// ============================================================
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: Role;
      photo?: string | null;
    };
  }

  interface User {
    role: Role;
    photo?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: Role;
    id: string;
    photo?: string | null;
  }
}
