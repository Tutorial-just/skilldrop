import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  Clock3,
  Euro,
  FileText,
  Lightbulb,
  Search,
  Sparkles,
  Star,
} from "lucide-react";

import { prisma } from "@/lib/prisma";
import {
  calculatePricingBreakdown,
  formatMoneyFromCents,
} from "@/config/pricing";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type CategoryPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({ params }: CategoryPageProps) {
  const { slug } = await params;

  const category = await prisma.category.findUnique({
    where: {
      slug,
    },
    select: {
      name: true,
      description: true,
    },
  });

  if (!category) {
    return {
      title: "Category not found | SkillDrop",
    };
  }

  return {
    title: `${category.name} | SkillDrop`,
    description:
      category.description ??
      `Find SkillDrop helpers for ${category.name} and book a short 1:1 call.`,
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;

  const category = await prisma.category.findFirst({
    where: {
      slug,
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
          },
        },
        include: {
          subcategory: true,
          expert: {
            include: {
              user: true,
              availability: {
                where: {
                  startTime: {
                    gte: new Date(),
                  },
                  isActive: true,
                },
                orderBy: {
                  startTime: "asc",
                },
                take: 1,
              },
              reviews: {
                select: {
                  problemSolved: true,
                },
                take: 100,
              },
            },
          },
        },
        orderBy: {
          priceCents: "asc",
        },
      },
    },
  });

  if (!category) {
    notFound();
  }

  const services = category.services;
  const helpersMap = new Map<string, (typeof services)[number]["expert"]>();

  services.forEach((service) => {
    helpersMap.set(service.expert.id, service.expert);
  });

  const helpers = Array.from(helpersMap.values()).sort((a, b) => {
    if (a.isVerified !== b.isVerified) {
      return Number(b.isVerified) - Number(a.isVerified);
    }

    if (a.rating !== b.rating) {
      return b.rating - a.rating;
    }

    return b.totalSessions - a.totalSessions;
  });

  const lowestPrice =
    services.length > 0
      ? Math.min(...services.map((service) => service.priceCents))
      : null;

  const searchableQuery = category.name;

  return (
    <main>
      <section className="relative overflow-hidden border-b border-[var(--border)]">
        <div className="surface-grid absolute inset-0 opacity-40" />
        <div className="absolute left-[-160px] top-[-180px] h-[420px] w-[420px] rounded-full bg-[var(--primary)]/10 blur-3xl" />
        <div className="absolute bottom-[-220px] right-[-160px] h-[420px] w-[420px] rounded-full bg-[var(--accent)]/10 blur-3xl" />

        <div className="relative p-6 md:p-8 lg:p-10">
          <Link
            href="/categories"
            className="inline-flex items-center gap-2 text-sm font-bold text-[var(--primary-dark)]"
          >
            <ArrowLeft size={16} />
            Back to categories
          </Link>

          <div className="mt-6 grid gap-8 xl:grid-cols-[1fr_360px] xl:items-end">
            <div>
              <Badge variant="primary">
                <Sparkles size={14} />
                SkillDrop category
              </Badge>

              <h1 className="heading-lg mt-5 max-w-4xl text-balance">
                {category.name}
              </h1>

              <p className="mt-4 max-w-2xl text-lg leading-8 text-[var(--muted-foreground)]">
                {category.description ??
                  "Find people who can explain, advise, teach or guide you through this problem area."}
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <ButtonLink href={`/experts?category=${category.slug}`}>
                  Search helpers
                  <Search size={18} />
                </ButtonLink>

                <ButtonLink
                  href={`/help-request?query=${encodeURIComponent(category.name)}`}
                  variant="secondary"
                >
                  Request specific help
                  <ArrowRight size={18} />
                </ButtonLink>
              </div>
            </div>

            <Card className="p-5 md:p-6">
              <Badge variant="accent">
                <FileText size={14} />
                Category stats
              </Badge>

              <div className="mt-5 grid gap-3">
                <InfoRow label="Helpers" value={String(helpers.length)} />
                <InfoRow label="Offers" value={String(services.length)} />
                <InfoRow
                  label="Starting price"
                  value={lowestPrice ? formatMoney(lowestPrice) : "—"}
                />
              </div>
            </Card>
          </div>
        </div>
      </section>

      <section className="p-6 md:p-8 lg:p-10">
        <div className="grid gap-6">
          {category.subcategories.length > 0 ? (
            <Card className="p-5 md:p-6">
              <Badge variant="accent">
                <Lightbulb size={14} />
                Subcategories
              </Badge>

              <h2 className="mt-4 text-3xl font-black tracking-[-0.05em]">
                More specific problems inside {category.name}.
              </h2>

              <div className="mt-6 flex flex-wrap gap-3">
                {category.subcategories.map((subcategory) => (
                  <Link
                    key={subcategory.id}
                    href={`/experts?category=${category.slug}&subcategory=${subcategory.slug}`}
                    className="rounded-full border border-[var(--border)] bg-[var(--card-soft)] px-4 py-2 text-sm font-bold text-[var(--muted-foreground)] transition hover:border-[var(--border-strong)] hover:bg-[var(--background-soft)] hover:text-[var(--foreground)]"
                  >
                    {subcategory.name}
                  </Link>
                ))}
              </div>
            </Card>
          ) : null}

          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <Badge variant="primary">
                <BadgeCheck size={14} />
                Matching helpers
              </Badge>

              <h2 className="mt-4 text-3xl font-black tracking-[-0.05em]">
                Helpers in this category.
              </h2>

              <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-[var(--muted-foreground)]">
                Ranked by verification, rating and sessions. Open a profile to
                choose an offer and book a short call.
              </p>
            </div>

            <Link
              href={`/experts?q=${encodeURIComponent(searchableQuery)}`}
              className="btn btn-secondary w-fit"
            >
              Search marketplace
            </Link>
          </div>

          {helpers.length > 0 ? (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {helpers.map((helper) => {
                const helperServices = services
                  .filter((service) => service.expertId === helper.id)
                  .slice(0, 3);

                return (
                  <HelperCategoryCard
                    key={helper.id}
                    helper={helper}
                    services={helperServices}
                  />
                );
              })}
            </div>
          ) : (
            <Card className="p-8 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary-dark)]">
                <Search size={24} />
              </div>

              <h3 className="mt-5 text-2xl font-black tracking-[-0.04em]">
                No helpers in this category yet
              </h3>

              <p className="mx-auto mt-3 max-w-md text-sm font-medium leading-6 text-[var(--muted-foreground)]">
                This category exists, but there are no bookable helpers yet.
                Request this help so SkillDrop can understand demand.
              </p>

              <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <ButtonLink
                  href={`/help-request?query=${encodeURIComponent(category.name)}`}
                >
                  Request this help
                  <ArrowRight size={18} />
                </ButtonLink>

                <ButtonLink href="/experts" variant="secondary">
                  Browse all helpers
                </ButtonLink>
              </div>
            </Card>
          )}
        </div>
      </section>
    </main>
  );
}

function HelperCategoryCard({
  helper,
  services,
}: {
  helper: {
    id: string;
    headline: string;
    rating: number;
    totalReviews: number;
    totalSessions: number;
    isVerified: boolean;
    skills: string[];
    user: {
      name: string | null;
      email: string;
    };
    availability: {
      id: string;
      startTime: Date;
    }[];
    reviews: {
      problemSolved: string | null;
    }[];
  };
  services: {
    id: string;
    title: string;
    priceCents: number;
    durationMinutes: number;
    helpType: string;
    subcategory: {
      name: string;
    } | null;
  }[];
}) {
  const startingPrice =
    services.length > 0
      ? Math.min(...services.map((service) => service.priceCents))
      : null;

  const startingTotal = startingPrice
    ? calculatePricingBreakdown(startingPrice).clientTotalCents
    : null;

  const helperName = helper.user.name ?? helper.user.email;
  const solvedReviews = helper.reviews.filter(
    (review) => review.problemSolved === "YES",
  ).length;
  const knownOutcomeReviews = helper.reviews.filter((review) =>
    ["YES", "PARTIALLY", "NO"].includes(review.problemSolved ?? ""),
  ).length;
  const solvedRate =
    knownOutcomeReviews > 0
      ? Math.round((solvedReviews / knownOutcomeReviews) * 100)
      : null;

  return (
    <Link href={`/experts/${helper.id}`} className="group">
      <Card className="flex h-full flex-col p-5 transition group-hover:-translate-y-0.5 group-hover:shadow-[var(--shadow-md)]">
        <div className="flex items-start justify-between gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[22px] bg-[var(--primary)] text-xl font-black text-white">
            {helperName.charAt(0).toUpperCase()}
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            {helper.isVerified ? (
              <Badge variant="success">
                <BadgeCheck size={14} />
                Verified
              </Badge>
            ) : (
              <Badge variant="accent">New</Badge>
            )}

            {solvedRate !== null ? (
              <Badge variant={solvedRate >= 70 ? "success" : "accent"}>
                {solvedRate}% solved
              </Badge>
            ) : null}
          </div>
        </div>

        <h3 className="mt-5 text-2xl font-black tracking-[-0.04em]">
          {helperName}
        </h3>

        <p className="mt-2 line-clamp-2 min-h-[48px] text-sm font-medium leading-6 text-[var(--muted-foreground)]">
          {helper.headline}
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <SmallPill icon={Star} text={`${helper.rating.toFixed(1)} rating`} />
          <SmallPill icon={Clock3} text={`${helper.totalSessions} sessions`} />
          {helper.availability[0] ? (
            <SmallPill
              icon={CalendarDays}
              text={`Next: ${formatDate(helper.availability[0].startTime)}`}
            />
          ) : null}
        </div>

        <div className="mt-5 grid gap-2">
          {services.map((service) => (
            <div
              key={service.id}
              className="rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] p-3"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="line-clamp-1 text-sm font-bold text-[var(--foreground)]">
                  {service.title}
                </p>

                <p className="shrink-0 text-sm font-black text-[var(--primary-dark)]">
                  {formatMoney(service.priceCents)}
                </p>
              </div>

              <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold text-[var(--muted-foreground)]">
                <span>{formatHelpType(service.helpType)}</span>
                <span>·</span>
                <span>{service.durationMinutes} min</span>
                {service.subcategory ? (
                  <>
                    <span>·</span>
                    <span>{service.subcategory.name}</span>
                  </>
                ) : null}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-auto flex items-center justify-between border-t border-[var(--border)] pt-5">
          <div>
            <p className="text-xs font-bold text-[var(--muted-foreground)]">
              Starting total
            </p>
            <p className="text-xl font-black">
              {startingTotal ? formatMoney(startingTotal) : "—"}
            </p>
          </div>

          <span className="btn btn-secondary">
            View profile
            <ArrowRight size={17} />
          </span>
        </div>
      </Card>
    </Link>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] p-3">
      <p className="text-sm font-medium text-[var(--muted-foreground)]">
        {label}
      </p>

      <p className="text-right text-sm font-bold text-[var(--foreground)]">
        {value}
      </p>
    </div>
  );
}

function SmallPill({
  icon: Icon,
  text,
}: {
  icon: typeof Star;
  text: string;
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--card-soft)] px-3 py-1.5 text-xs font-bold text-[var(--muted-foreground)]">
      <Icon size={13} />
      {text}
    </span>
  );
}

function formatMoney(cents: number) {
  return formatMoneyFromCents(cents);
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatHelpType(helpType: string) {
  return helpType
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
