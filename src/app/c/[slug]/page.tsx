import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CalendarDays, CheckCircle2, Search, Sparkles, Target, type LucideIcon } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ExpertCard } from "@/components/experts/expert-card";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const category = await prisma.category.findUnique({ where: { slug } });
  return {
    title: category ? `${category.name} helpers | SkillDrop` : "SkillDrop category",
    description: category?.description || "Find SkillDrop helpers and book a practical short call.",
  };
}

export default async function SeoCategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const category = await prisma.category.findUnique({
    where: { slug },
    include: {
      subcategories: { where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] },
      services: {
        where: { isActive: true, moderationStatus: "APPROVED", expert: { status: "APPROVED" } },
        include: { expert: { include: { user: true, services: { where: { isActive: true, moderationStatus: "APPROVED" }, include: { category: true, subcategory: true }, orderBy: { priceCents: "asc" }, take: 3 }, availability: { where: { isActive: true, endTime: { gte: new Date() } }, orderBy: { startTime: "asc" }, take: 1 }, reviews: { select: { problemSolved: true }, take: 20 } } } },
        take: 9,
      },
    },
  });

  if (!category || !category.isActive) notFound();

  const experts = Array.from(new Map(category.services.map((service) => [service.expert.id, service.expert])).values()).slice(0, 6);

  return (
    <main>
      <section className="relative overflow-hidden border-b border-[var(--border)]">
        <div className="surface-grid absolute inset-0 opacity-40" />
        <div className="relative container-page py-10 md:py-14">
          <Link href="/c" className="text-sm font-black text-[var(--primary-dark)]">← All categories</Link>
          <Badge variant="primary" className="mt-6"><Sparkles size={14} /> SkillDrop category</Badge>
          <h1 className="heading-lg mt-5 max-w-4xl text-balance">{category.name} help in short 1:1 calls.</h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-[var(--muted-foreground)]">{category.description || "Describe your problem, compare helpers and book a short call that ends with clear next steps."}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href={`/help-me?category=${category.slug}`} variant="primary">Describe a problem <ArrowRight size={18} /></ButtonLink>
            <ButtonLink href={`/experts?category=${category.slug}`} variant="secondary">Browse helpers</ButtonLink>
          </div>
        </div>
      </section>

      <section className="container-page py-10 md:py-14">
        <div className="grid gap-4 md:grid-cols-3">
          <Value icon={Search} title="Describe" text="Write your situation, goal and what you already tried." />
          <Value icon={CalendarDays} title="Book" text="Choose an available helper and a call slot." />
          <Value icon={Target} title="Leave with next steps" text="SkillDrop outcomes make the call useful after it ends." />
        </div>

        {category.subcategories.length > 0 ? (
          <Card className="mt-8 p-5">
            <Badge variant="accent">Subcategories</Badge>
            <div className="mt-4 flex flex-wrap gap-2">
              {category.subcategories.map((sub) => (
                <Link key={sub.id} href={`/experts?category=${sub.slug}`} className="rounded-full border border-[var(--border)] bg-[var(--card-soft)] px-4 py-2 text-sm font-black text-[var(--muted-foreground)] hover:border-[var(--border-strong)]">{sub.name}</Link>
              ))}
            </div>
          </Card>
        ) : null}

        <div className="mt-10 flex items-end justify-between gap-4">
          <div>
            <Badge variant="primary">Available helpers</Badge>
            <h2 className="mt-3 text-3xl font-black tracking-[-0.05em]">Best helpers for {category.name.toLowerCase()}</h2>
          </div>
          <ButtonLink href={`/experts?category=${category.slug}`} variant="secondary">View all</ButtonLink>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {experts.length > 0 ? experts.map((expert) => <ExpertCard key={expert.id} expert={expert} />) : (
            <Card className="p-6 md:col-span-2 xl:col-span-3">
              <Badge variant="accent">No helper yet</Badge>
              <h3 className="mt-4 text-2xl font-black tracking-[-0.04em]">This category needs more helpers.</h3>
              <p className="mt-2 text-sm font-medium leading-6 text-[var(--muted-foreground)]">Create a problem request so SkillDrop can recommend the closest available helpers or detect missing supply.</p>
            </Card>
          )}
        </div>
      </section>
    </main>
  );
}

function Value({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return <Card className="p-5"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary-dark)]"><Icon size={20} /></div><h2 className="mt-4 text-xl font-black tracking-[-0.04em]">{title}</h2><p className="mt-2 text-sm font-medium leading-6 text-[var(--muted-foreground)]">{text}</p></Card>;
}
