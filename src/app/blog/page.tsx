import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { prisma } from "@/lib/prisma";
import { formatDate, readingTime } from "@/lib/utils";
import { Calendar, Clock, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Blog & News",
  description:
    "Property market insights, buying guides, and real estate news from Prestige Properties.",
};

export const revalidate = 3600;

export default async function BlogPage() {
  const posts = await prisma.blogPost.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
    include: {
      author: { select: { name: true, photo: true } },
    },
  }).catch(() => []);

  return (
    <>
      <Navbar />
      <main id="main-content">
        {/* Header */}
        <section className="bg-navy-900 py-20">
          <div className="section-container">
            <nav aria-label="Breadcrumb" className="mb-6">
              <ol className="flex items-center gap-2 text-xs text-cream-500">
                <li><Link href="/" className="hover:text-gold-400 transition-colors">Home</Link></li>
                <li>/</li>
                <li className="text-cream-200" aria-current="page">Blog & News</li>
              </ol>
            </nav>
            <span className="eyebrow block mb-3 text-gold-400">Insights & Guides</span>
            <h1 className="font-display text-display-xl font-light text-cream-100">
              Property Blog
            </h1>
          </div>
        </section>

        {/* Posts Grid */}
        <section className="section-padding bg-background">
          <div className="section-container">
            {posts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <ArrowRight size={24} className="text-muted-foreground" />
                </div>
                <h2 className="font-display text-2xl font-light text-foreground mb-2">
                  No posts yet
                </h2>
                <p className="text-muted-foreground">
                  Check back soon for property insights and market news.
                </p>
              </div>
            ) : (
              <>
                {/* Featured post */}
                {posts[0] && (
                  <article className="group mb-12 grid lg:grid-cols-2 gap-8 items-center">
                    <Link href={`/blog/${posts[0].slug}`} className="block">
                      <div className="aspect-video rounded-2xl overflow-hidden bg-muted">
                        {posts[0].coverImageUrl ? (
                          <Image
                            src={posts[0].coverImageUrl}
                            alt={posts[0].title}
                            width={800}
                            height={450}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            priority
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-luxury flex items-center justify-center">
                            <span className="font-display text-7xl font-light text-gold-400">
                              {posts[0].title[0]}
                            </span>
                          </div>
                        )}
                      </div>
                    </Link>
                    <div>
                      {posts[0].categories[0] && (
                        <span className="eyebrow block mb-3">{posts[0].categories[0]}</span>
                      )}
                      <Link href={`/blog/${posts[0].slug}`}>
                        <h2 className="font-display text-display-sm font-light text-foreground hover:text-gold-600 transition-colors mb-4">
                          {posts[0].title}
                        </h2>
                      </Link>
                      <p className="text-muted-foreground leading-relaxed mb-5">
                        {posts[0].excerpt}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6">
                        {posts[0].publishedAt && (
                          <span className="flex items-center gap-1.5">
                            <Calendar size={13} />
                            {formatDate(posts[0].publishedAt, "long")}
                          </span>
                        )}
                        {posts[0].readTime && (
                          <span className="flex items-center gap-1.5">
                            <Clock size={13} />
                            {posts[0].readTime} min read
                          </span>
                        )}
                      </div>
                      <Link
                        href={`/blog/${posts[0].slug}`}
                        className="btn-gold inline-flex"
                      >
                        Read Article <ArrowRight size={16} />
                      </Link>
                    </div>
                  </article>
                )}

                {/* Remaining posts */}
                {posts.length > 1 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {posts.slice(1).map((post) => (
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
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-luxury flex items-center justify-center">
                                <span className="font-display text-4xl font-light text-gold-400">
                                  {post.title[0]}
                                </span>
                              </div>
                            )}
                          </div>
                          {post.categories[0] && (
                            <span className="eyebrow text-2xs block mb-2">{post.categories[0]}</span>
                          )}
                          <h2 className="font-display text-xl font-light text-foreground group-hover:text-gold-600 transition-colors line-clamp-2 mb-2">
                            {post.title}
                          </h2>
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                            {post.excerpt}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span>{post.author.name}</span>
                            {post.publishedAt && (
                              <>
                                <span>·</span>
                                <span>{formatDate(post.publishedAt, "short")}</span>
                              </>
                            )}
                            {post.readTime && (
                              <>
                                <span>·</span>
                                <span>{post.readTime} min</span>
                              </>
                            )}
                          </div>
                        </Link>
                      </article>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
