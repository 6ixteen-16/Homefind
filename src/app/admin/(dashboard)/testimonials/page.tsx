import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminTestimonialsClient } from "@/components/admin/AdminTestimonialsClient";

export const metadata: Metadata = { title: "Testimonials — Admin" };
export const dynamic = "force-dynamic";

export default async function AdminTestimonialsPage() {
  const session = await auth();
  if (!session?.user) return null;

  const testimonials = await prisma.testimonial.findMany({
    orderBy: { sortOrder: "asc" },
  }).catch(() => []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-display-sm font-light text-foreground">
          Testimonials
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage client reviews displayed on the homepage.
        </p>
      </div>
      <AdminTestimonialsClient testimonials={testimonials} />
    </div>
  );
}
