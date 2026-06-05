import Link from "next/link";
import {
  ArrowRight,
  Compass,
  Lightbulb,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { prisma } from "@/lib/prisma";
import { CategoryGrid } from "@/components/marketing/category-grid";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const metadata = {
  title: "Categories | SkillDrop",
  description:
    "Browse SkillDrop categories and find helpers for short 1:1 calls around everyday, career, business, relationship, cooking, faith, tech and admin problems.",
};

export default async function CategoriesPage() {
  const categories = await prisma.category.findMany({
    where: {
      isActive: true,
    },
    include: {
      subcategories: {
        where: {
          isActive: true,
        },
        orderBy: [
          {
            sortOrder: "asc",
          },
          {
            name: "asc",
          },
        ],
      },
      services: {
        where: {
          isActive: true,
          expert: {
            status: "APPROVED",
            stripeAccountId: {
              not: null,
            },
          },
        },
        select: {
          id: true,
          expertId: true,
        },
      },
    },
    orderBy: [
      {
        sortOrder: "asc",
      },
      {
        name: "asc",
      },
    ],
  });

  const categoriesForGrid = categories.map((category) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    icon: category.icon,
    servicesCount: category.services.length,
    helpersCount: new Set(category.services.map((service) => service.expertId))
      .size,
  }));

  const totalOffers = categories.reduce(
    (sum, category) => sum + category.services.length,
    0,
  );

  const totalHelpers = new Set(
    categories.flatMap((category) =>
      category.services.map((service) => service.expertId),
    ),
  ).size;

  return (
    <main>
      <section className="relative overflow-hidden border-b border-[var(--border)]">
        <div className="surface-grid absolute inset-0 opacity-40" />
        <div className="absolute left-[-160px] top-[-180px] h-[420px] w-[420px] rounded-full bg-[var(--primary)]/10 blur-3xl" />
        <div className="absolute bottom-[-220px] right-[-160px] h-[420px] w-[420px] rounded-full bg-[var(--accent)]/10 blur-3xl" />

        <div className="relative p-6 md:p-8 lg:p-10">
          <div className="grid gap-8 xl:grid-cols-[1fr_auto] xl:items-end">
            <div>
              <Badge variant="primary">
                <Sparkles size={14} />
                SkillDrop categories
              </Badge>

              <h1 className="heading-lg mt-5 max-w-4xl text-balance">
                Start with the problem, then find the right person.
              </h1>

              <p className="mt-4 max-w-2xl text-lg leading-8 text-[var(--muted-foreground)]">
                SkillDrop can grow around almost any problem, but categories
                stay clean and controlled. Browse the official categories,
                search in your own words, or request a missing type of help.
              </p>

              <form action="/experts" className="mt-7 max-w-3xl">
                <div className="rounded-[28px] border border-[var(--border)] bg-[var(--card)] p-3 shadow-[var(--shadow-sm)] backdrop-blur">
                  <div className="flex flex-col gap-3 md:flex-row">
                    <div className="relative flex-1">
                      <Search
                        size={18}
                        className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]"
                      />

                      <input
                        name="q"
                        type="search"
                        placeholder="Search: dating advice, cooking, religion, business, documents..."
                        className="input min-h-[54px] border-transparent bg-[var(--background-soft)] pl-12 shadow-none"
                      />
                    </div>

                    <button type="submit" className="btn btn-primary min-h-[54px]">
                      Find help
                      <ArrowRight size={18} />
                    </button>
                  </div>
                </div>
              </form>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row xl:flex-col">
              <ButtonLink href="/experts">
                <Compass size={18} />
                Browse helpers
              </ButtonLink>

              <ButtonLink href="/help-request" variant="secondary">
                Request missing help
                <ArrowRight size={18} />
              </ButtonLink>
            </div>
          </div>

          <div className="mt-8 grid gap-3 md:grid-cols-3">
            <MetricCard label="Categories" value={String(categories.length)} />
            <MetricCard label="Bookable offers" value={String(totalOffers)} />
            <MetricCard label="Helpers" value={String(totalHelpers)} />
          </div>
        </div>
      </section>

      <CategoryGrid
        categories={categoriesForGrid}
        title="Browse official categories"
        subtitle="Choose a clean category, then explore helpers and focused offers inside it."
      />

      <section className="px-6 pb-12">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-2">
          <Card soft className="p-5 md:p-6">
            <Badge variant="accent">
              <Lightbulb size={14} />
              Why categories are controlled
            </Badge>

            <h2 className="mt-4 text-2xl font-black tracking-[-0.04em]">
              Any problem, but not messy.
            </h2>

            <p className="mt-3 text-sm font-medium leading-6 text-[var(--muted-foreground)]">
              Buyers can search for anything, but public categories should stay
              clear. If everyone creates categories freely, the marketplace
              becomes full of duplicates and unsafe topics.
            </p>
          </Card>

          <Card className="p-5 md:p-6">
            <Badge variant="primary">
              <ShieldCheck size={14} />
              Missing category?
            </Badge>

            <h2 className="mt-4 text-2xl font-black tracking-[-0.04em]">
              Request it instead of creating chaos.
            </h2>

            <p className="mt-3 text-sm font-medium leading-6 text-[var(--muted-foreground)]">
              If a buyer searches for something that does not exist yet, they
              can leave a request. Admin can approve, merge or reject it later.
            </p>

            <div className="mt-5">
              <ButtonLink href="/help-request" variant="secondary">
                Request new help
                <ArrowRight size={18} />
              </ButtonLink>
            </div>
          </Card>
        </div>
      </section>
    </main>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card soft className="p-5">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
        {label}
      </p>

      <p className="mt-2 text-3xl font-black tracking-[-0.05em] text-[var(--foreground)]">
        {value}
      </p>
    </Card>
  );
}
