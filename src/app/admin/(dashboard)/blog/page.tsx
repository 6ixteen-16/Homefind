import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import Image from "next/image";
import { formatDate } from "@/lib/utils";
import { Plus, Pencil, Eye, FileText } from "lucide-react";

export const metadata: Metadata = { title: "Blog Posts — Admin" };
export const dynamic = "force-dynamic";

const STATUS_COLORS: Record<string, string> = {
  DRAFT:     "bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-900",
  SCHEDULED: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950",
  PUBLISHED: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950",
};

export default async function AdminBlogPage() {
  const session = await auth();
  if (!session?.user) return null;

  const canManage = ["SUPER_ADMIN", "ADMIN", "EDITOR"].includes(session.user.role);
  if (!canManage) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        You don&apos;t have permission to manage blog posts.
      </div>
    );
  }

  const posts = await prisma.blogPost.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      author: { select: { id: true, name: true } },
    },
  }).catch(() => []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-display-sm font-light text-foreground">
            Blog Posts
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {posts.length} post{posts.length !== 1 ? "s" : ""} total
          </p>
        </div>
        <Link href="/admin/blog/new" className="btn-gold">
          <Plus size={16} />
          New Post
        </Link>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-luxury overflow-hidden">
        {posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <FileText size={36} className="text-muted-foreground/40 mb-3" />
            <h3 className="font-medium text-foreground mb-1">No blog posts yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first post to start building your content library.
            </p>
            <Link href="/admin/blog/new" className="btn-gold text-sm">
              <Plus size={14} /> Write First Post
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {posts.map((post) => (
              <div key={post.id} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors">
                {/* Thumbnail */}
                <div className="relative w-16 h-12 rounded-lg overflow-hidden bg-muted shrink-0">
                  {post.coverImageUrl ? (
                    <Image src={post.coverImageUrl} alt="" fill className="object-cover" />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-luxury flex items-center justify-center">
                      <span className="font-display text-gold-400 text-xl">{post.title[0]}</span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-foreground text-sm truncate">{post.title}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_COLORS[post.status] ?? STATUS_COLORS.DRAFT}`}>
                      {post.status.toLowerCase()}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                    <span>{post.author.name}</span>
                    <span>·</span>
                    {post.publishedAt ? (
                      <span>Published {formatDate(post.publishedAt, "short")}</span>
                    ) : (
                      <span>Created {formatDate(post.createdAt, "short")}</span>
                    )}
                    {post.readTime && (
                      <>
                        <span>·</span>
                        <span>{post.readTime} min read</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  {post.status === "PUBLISHED" && (
                    <Link
                      href={`/blog/${post.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="View post"
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      <Eye size={15} />
                    </Link>
                  )}
                  <Link
                    href={`/admin/blog/${post.id}`}
                    aria-label="Edit post"
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-gold-600 hover:bg-gold-500/10 transition-colors"
                  >
                    <Pencil size={15} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
