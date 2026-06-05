import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  BriefcaseBusiness,
  ChefHat,
  Code2,
  FileText,
  Globe2,
  HeartHandshake,
  Languages,
  LifeBuoy,
  MessageCircleHeart,
  Search,
  Sparkles,
  UsersRound,
} from "lucide-react";

type CategoryGridCategory = {
  id?: string;
  name: string;
  slug: string;
  description?: string | null;
  icon?: string | null;
  servicesCount?: number;
  helpersCount?: number;
};

type CategoryGridProps = {
  categories?: CategoryGridCategory[];
  title?: string;
  subtitle?: string;
  showEmptyState?: boolean;
};

const fallbackCategories: CategoryGridCategory[] = [
  {
    name: "Life & Everyday",
    slug: "life-everyday",
    description: "Daily questions, decisions and practical problems.",
    icon: "LIFE",
  },
  {
    name: "Relationships",
    slug: "relationships",
    description: "Dating, communication, confidence and social situations.",
    icon: "RELATIONSHIPS",
  },
  {
    name: "Business",
    slug: "business",
    description: "Ideas, first clients, pricing, positioning and growth.",
    icon: "BUSINESS",
  },
  {
    name: "Career & Studies",
    slug: "career-studies",
    description: "CV, interviews, applications, school and job decisions.",
    icon: "CAREER",
  },
  {
    name: "Documents & Admin",
    slug: "documents-admin",
    description: "Forms, letters, procedures and confusing documents.",
    icon: "DOCUMENTS",
  },
  {
    name: "Tech & Digital",
    slug: "tech-digital",
    description: "Coding, websites, IT issues and digital tools.",
    icon: "TECH",
  },
  {
    name: "Cooking",
    slug: "cooking",
    description: "Recipes, meal ideas, techniques and kitchen confidence.",
    icon: "COOKING",
  },
  {
    name: "Faith & Religion",
    slug: "faith-religion",
    description: "Learn, ask questions and talk with knowledgeable people.",
    icon: "FAITH",
  },
  {
    name: "Languages & Culture",
    slug: "languages-culture",
    description: "Language practice, translation, culture and local life.",
    icon: "LANGUAGES",
  },
];

export function CategoryGrid({
  categories,
  title = "Popular help categories",
  subtitle = "Start from a problem area, then choose a helper for a short 1:1 call.",
  showEmptyState = true,
}: CategoryGridProps) {
  const visibleCategories =
    categories && categories.length > 0 ? categories : fallbackCategories;

  if (visibleCategories.length === 0 && !showEmptyState) {
    return null;
  }

  return (
    <section className="mx-auto max-w-7xl px-6 py-12">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--card-soft)] px-4 py-2 text-sm font-bold text-[var(--primary-dark)]">
            <Sparkles size={15} />
            SkillDrop categories
          </div>

          <h2 className="mt-5 text-3xl font-black tracking-[-0.05em] text-[var(--foreground)] md:text-4xl">
            {title}
          </h2>

          <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-[var(--muted-foreground)] md:text-base md:leading-7">
            {subtitle}
          </p>
        </div>

        <Link href="/experts" className="btn btn-secondary w-fit">
          Browse helpers
          <ArrowRight size={17} />
        </Link>
      </div>

      {visibleCategories.length > 0 ? (
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleCategories.map((category) => {
            const Icon = getCategoryIcon(category.icon, category.slug);

            return (
              <Link
                key={category.id ?? category.slug}
                href={`/categories/${category.slug}`}
                className="group h-full rounded-[28px] border border-[var(--border)] bg-[var(--card)] p-5 shadow-[var(--shadow-sm)] transition hover:-translate-y-0.5 hover:border-[var(--border-strong)] hover:bg-[var(--background-soft)] hover:shadow-[var(--shadow-md)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-13 w-13 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary-dark)]">
                    <Icon size={22} />
                  </div>

                  <div className="flex flex-wrap justify-end gap-2">
                    {typeof category.helpersCount === "number" ? (
                      <span className="rounded-full border border-[var(--border)] bg-[var(--card-soft)] px-3 py-1 text-xs font-bold text-[var(--muted-foreground)]">
                        {category.helpersCount} helpers
                      </span>
                    ) : null}

                    {typeof category.servicesCount === "number" ? (
                      <span className="rounded-full border border-[var(--border)] bg-[var(--card-soft)] px-3 py-1 text-xs font-bold text-[var(--muted-foreground)]">
                        {category.servicesCount} offers
                      </span>
                    ) : null}
                  </div>
                </div>

                <h3 className="mt-5 text-2xl font-black tracking-[-0.04em] text-[var(--foreground)]">
                  {category.name}
                </h3>

                <p className="mt-3 line-clamp-3 min-h-[72px] text-sm font-medium leading-6 text-[var(--muted-foreground)]">
                  {category.description ??
                    "Find someone who can explain, advise, teach or guide you."}
                </p>

                <div className="mt-6 flex items-center justify-between border-t border-[var(--border)] pt-4">
                  <span className="text-sm font-bold text-[var(--primary-dark)]">
                    View category
                  </span>

                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--foreground)] text-[var(--background)] transition group-hover:translate-x-0.5">
                    <ArrowRight size={16} />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="mt-8 rounded-[28px] border border-dashed border-[var(--border-strong)] bg-[var(--card-soft)] p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary-dark)]">
            <Search size={24} />
          </div>

          <h3 className="mt-5 text-2xl font-black tracking-[-0.04em]">
            No categories yet
          </h3>

          <p className="mx-auto mt-3 max-w-md text-sm font-medium leading-6 text-[var(--muted-foreground)]">
            Categories will appear here after you add them to the database.
          </p>
        </div>
      )}
    </section>
  );
}

function getCategoryIcon(icon?: string | null, slug?: string) {
  const key = `${icon ?? ""} ${slug ?? ""}`.toLowerCase();

  if (key.includes("relationship") || key.includes("dating")) {
    return MessageCircleHeart;
  }

  if (key.includes("business") || key.includes("startup")) {
    return BriefcaseBusiness;
  }

  if (key.includes("career") || key.includes("study") || key.includes("job")) {
    return UsersRound;
  }

  if (key.includes("document") || key.includes("admin") || key.includes("cv")) {
    return FileText;
  }

  if (key.includes("tech") || key.includes("digital") || key.includes("code")) {
    return Code2;
  }

  if (key.includes("cook") || key.includes("recipe")) {
    return ChefHat;
  }

  if (key.includes("faith") || key.includes("religion")) {
    return BookOpen;
  }

  if (key.includes("language") || key.includes("culture")) {
    return Languages;
  }

  if (key.includes("abroad") || key.includes("travel") || key.includes("local")) {
    return Globe2;
  }

  if (key.includes("support") || key.includes("wellness")) {
    return HeartHandshake;
  }

  return LifeBuoy;
}
