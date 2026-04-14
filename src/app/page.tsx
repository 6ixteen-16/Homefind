import type { Metadata } from "next";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/home/HeroSection";
import { StatsSection } from "@/components/home/StatsSection";
import { FeaturedProperties } from "@/components/home/FeaturedProperties";
import { CategoryCards } from "@/components/home/CategoryCards";
import { WhyChooseUs, HowItWorks, TestimonialsSection, CtaBanner, LatestBlog } from "@/components/home/HomeComponents";
import { prisma } from "@/lib/prisma";
import type { PropertyCardData } from "@/types";

export const metadata: Metadata = {
  title: "HomeFind — Luxury Real Estate",
  description:
    "Discover exceptional residential and commercial properties. HomeFind connects discerning buyers and renters with the finest real estate across the region.",
};

// ISR — revalidate every 60 seconds
export const revalidate = 60;

async function getFeaturedProperties(): Promise<PropertyCardData[]> {
  try {
    const properties = await prisma.property.findMany({
      where: {
        isFeatured: true,
        status: "PUBLISHED",
        deletedAt: null,
      },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true,
        slug: true,
        title: true,
        listingType: true,
        category: true,
        propertyType: true,
        status: true,
        price: true,
        currency: true,
        priceNegotiable: true,
        bedrooms: true,
        bathrooms: true,
        squareFootage: true,
        city: true,
        area: true,
        country: true,
        latitude: true,
        longitude: true,
        isFeatured: true,
        views: true,
        publishedAt: true,
        createdAt: true,
        media: {
          where: { isFeatured: true, type: "IMAGE" },
          select: { url: true },
          take: 1,
        },
        agent: {
          select: { id: true, name: true, photo: true },
        },
      },
    });

    return properties.map((p) => ({
      ...p,
      featuredImage: p.media[0]?.url || null,
    }));
  } catch {
    return [];
  }
}

async function getTestimonials() {
  try {
    return await prisma.testimonial.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      take: 8,
    });
  } catch {
    return [];
  }
}

async function getLatestBlogPosts() {
  try {
    return await prisma.blogPost.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { publishedAt: "desc" },
      take: 3,
      select: {
        id: true,
        slug: true,
        title: true,
        excerpt: true,
        coverImageUrl: true,
        publishedAt: true,
        categories: true,
        readTime: true,
        author: {
          select: { name: true, photo: true },
        },
      },
    });
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const [featuredProperties, testimonials, blogPosts] = await Promise.all([
    getFeaturedProperties(),
    getTestimonials(),
    getLatestBlogPosts(),
  ]);

  const stats = {
    properties: 500,
    clients: 2000,
    experience: 12,
    cities: 24,
  };

  return (
    <>
      <Navbar />
      <main id="main-content">
        <HeroSection />
        <StatsSection stats={stats} />
        <FeaturedProperties properties={featuredProperties} />
        <CategoryCards />
        <WhyChooseUs />
        <HowItWorks />
        {testimonials.length > 0 && (
          <TestimonialsSection testimonials={testimonials} />
        )}
        <CtaBanner />
        {blogPosts.length > 0 && <LatestBlog posts={blogPosts} />}
      </main>
      <Footer />
    </>
  );
}
