import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { Calendar, Clock, ArrowLeft, Tag } from "lucide-react";
import isomorphicDompurify from "isomorphic-dompurify";

interface PageProps {
  params: { slug: string };
}

async function getPost(slug: string) {
  return prisma.blogPost.findUnique({
    where: { slug, status: "PUBLISHED" },
    include: { author: { select: { name: true, photo: true, bio: true } } },
  }).catch(() => null);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const post = await getPost(params.slug);
  if (!post) return { title: "Post Not Found" };
  return {
    title: post.metaTitle || post.title,
    description: post.metaDescription || post.excerpt,
    openGraph: {
      title: post.metaTitle || post.title,
      description: post.metaDescription || post.excerpt,
      images: post.coverImageUrl ? [{ url: post.coverImageUrl }] : [],
      type: "article",
    },
  };
}

export const revalidate = 3600;

export default async function BlogPostPage({ params }: PageProps) {
  const post = await getPost(params.slug);
  if (!post) notFound();

  const safeContent = isomorphicDompurify.sanitize(post.content);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    image: post.coverImageUrl,
    author: { "@type": "Person", name: post.author.name },
    datePublished: post.publishedAt?.toISOString(),
    dateModified: post.updatedAt.toISOString(),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Navbar />
      <main id="main-content">
        {/* Hero */}
        <section className="bg-navy-900 py-16 lg:py-24">
          <div className="section-container max-w-4xl">
            <nav aria-label="Breadcrumb" className="mb-6">
              <ol className="flex items-center gap-2 text-xs text-cream-500">
                <li><Link href="/" className="hover:text-gold-400 transition-colors">Home</Link></li>
                <li>/</li>
                <li><Link href="/blog" className="hover:text-gold-400 transition-colors">Blog</Link></li>
                <li>/</li>
                <li className="text-cream-200 truncate max-w-xs" aria-current="page">{post.title}</li>
              </ol>
            </nav>

            {post.categories.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {post.categories.map((cat) => (
                  <span key={cat} className="eyebrow text-2xs text-gold-400">{cat}</span>
                ))}
              </div>
            )}

            <h1 className="font-display text-display-lg font-light text-cream-100 mb-6 text-balance">
              {post.title}
            </h1>

            <div className="flex flex-wrap items-center gap-5 text-cream-400 text-sm">
              <div className="flex items-center gap-2">
                {post.author.photo ? (
                  <Image
                    src={post.author.photo}
                    alt={post.author.name}
                    width={32}
                    height={32}
                    className="rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gold-500/20 flex items-center justify-center text-gold-400 font-semibold text-sm">
                    {post.author.name[0]}
                  </div>
                )}
                <span>{post.author.name}</span>
              </div>
              {post.publishedAt && (
                <span className="flex items-center gap-1.5">
                  <Calendar size={13} />
                  {formatDate(post.publishedAt, "long")}
                </span>
              )}
              {post.readTime && (
                <span className="flex items-center gap-1.5">
                  <Clock size={13} />
                  {post.readTime} min read
                </span>
              )}
            </div>
          </div>
        </section>

        {/* Cover Image */}
        {post.coverImageUrl && (
          <div className="section-container max-w-4xl -mt-8 mb-0 relative z-10">
            <div className="aspect-video rounded-2xl overflow-hidden shadow-luxury-xl">
              <Image
                src={post.coverImageUrl}
                alt={post.title}
                width={896}
                height={504}
                className="w-full h-full object-cover"
                priority
              />
            </div>
          </div>
        )}

        {/* Content */}
        <div className="section-container max-w-4xl py-16">
          <div className="grid lg:grid-cols-[1fr_280px] gap-12">
            {/* Article body */}
            <article>
              <div
                className="prose-luxury"
                dangerouslySetInnerHTML={{ __html: safeContent }}
              />

              {/* Tags */}
              {post.tags.length > 0 && (
                <div className="mt-12 pt-6 border-t border-border">
                  <div className="flex flex-wrap items-center gap-2">
                    <Tag size={14} className="text-muted-foreground" />
                    {post.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-xs px-3 py-1 rounded-full bg-muted text-muted-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </article>

            {/* Sidebar */}
            <aside className="space-y-6">
              {/* Author card */}
              <div className="bg-card rounded-xl border border-border p-5 shadow-luxury">
                <h3 className="font-semibold text-foreground text-sm mb-4">About the Author</h3>
                <div className="flex items-center gap-3 mb-3">
                  {post.author.photo ? (
                    <Image
                      src={post.author.photo}
                      alt={post.author.name}
                      width={48}
                      height={48}
                      className="rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gold-500/20 flex items-center justify-center text-gold-600 font-display text-xl">
                      {post.author.name[0]}
                    </div>
                  )}
                  <div>
                    <div className="font-semibold text-foreground text-sm">{post.author.name}</div>
                    <div className="text-xs text-muted-foreground">Property Agent</div>
                  </div>
                </div>
                {post.author.bio && (
                  <p className="text-xs text-muted-foreground leading-relaxed">{post.author.bio}</p>
                )}
              </div>

              {/* Back to blog */}
              <Link
                href="/blog"
                className="flex items-center gap-2 text-sm text-gold-600 hover:text-gold-700 transition-colors font-medium"
              >
                <ArrowLeft size={14} />
                Back to Blog
              </Link>

              {/* Browse properties CTA */}
              <div className="bg-navy-900 rounded-xl p-5">
                <h3 className="font-display text-lg font-light text-cream-100 mb-2">
                  Browse Properties
                </h3>
                <p className="text-cream-400 text-xs mb-4 leading-relaxed">
                  Find your perfect residential or commercial property today.
                </p>
                <Link href="/properties" className="btn-gold text-sm w-full justify-center">
                  View Listings
                </Link>
              </div>
            </aside>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
