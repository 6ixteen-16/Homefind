import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminFAQsClient } from "@/components/admin/AdminFAQsClient";

export const metadata: Metadata = { title: "FAQs — Admin" };
export const dynamic = "force-dynamic";

export default async function AdminFAQsPage() {
  const session = await auth();
  if (!session?.user) return null;

  const faqs = await prisma.fAQ.findMany({
    orderBy: { sortOrder: "asc" },
  }).catch(() => []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-display-sm font-light text-foreground">
          FAQs
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage frequently asked questions displayed on the Services page.
        </p>
      </div>
      <AdminFAQsClient faqs={faqs} />
    </div>
  );
}
