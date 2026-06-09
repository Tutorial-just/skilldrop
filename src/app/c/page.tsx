import Link from "next/link";
import { ArrowRight, FolderOpen, Sparkles } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export const metadata = {
  title: "SkillDrop help categories",
  description: "Browse SkillDrop categories and find helpers for practical short calls.",
};

export default async function SeoCategoriesPage() {
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { services: true } } },
  });

  return (
    <main className="container-page py-8 md:py-12">
      <Badge variant="primary"><Sparkles size={14} /> Categories</Badge>
      <h1 className="heading-lg mt-5 max-w-3xl text-balance">Find short-call help by category.</h1>
      <p className="mt-4 max-w-2xl text-lg leading-8 text-[var(--muted-foreground)]">Each category page is designed for SEO and for buyers who already know the type of problem they want to solve.</p>

      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {categories.map((category) => (
          <Link key={category.id} href={`/c/${category.slug}`} className="group block h-full">
            <Card className="h-full p-5 transition group-hover:-translate-y-0.5 group-hover:border-[var(--border-strong)]">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary-dark)]"><FolderOpen size={22} /></div>
              <h2 className="mt-5 text-2xl font-black tracking-[-0.05em]">{category.name}</h2>
              <p className="mt-2 line-clamp-3 text-sm font-medium leading-6 text-[var(--muted-foreground)]">{category.description || "Book a short call with a helper who can explain the problem and give you next steps."}</p>
              <p className="mt-4 inline-flex items-center gap-2 text-sm font-black text-[var(--primary-dark)]">View helpers <ArrowRight size={16} /></p>
            </Card>
          </Link>
        ))}
      </div>
    </main>
  );
}
