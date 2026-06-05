import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Euro,
  Eye,
  FileText,
  Layers3,
  Lightbulb,
  Plus,
  Power,
  Search,
  ShieldCheck,
  Sparkles,
  Tags,
  Target,
  Trash2,
  WalletCards,
  type LucideIcon,
} from "lucide-react";

import {
  createServiceAction,
  deleteServiceAction,
  toggleServiceStatusAction,
} from "@/server/actions/service.actions";
import { requireRole } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import {
  calculatePricingBreakdown,
  formatMoneyFromCents,
} from "@/config/pricing";
import { ServiceEditModal } from "@/components/expert/service-edit-modal";
import { ServiceForm } from "@/components/forms/service-form";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const helpTypeLabels: Record<string, string> = {
  ADVICE: "Advice",
  EXPLANATION: "Explanation",
  TEACHING: "Teaching",
  PRACTICAL_GUIDANCE: "Practical guidance",
  PERSONAL_EXPERIENCE: "Personal experience",
  EMOTIONAL_SUPPORT: "Emotional support",
  RELIGIOUS_DISCUSSION: "Religious discussion",
  BUSINESS_MENTORING: "Business mentoring",
  OTHER: "Other",
};

type ExpertServicesPageProps = {
  searchParams?: Promise<{
    error?: string;
    created?: string;
    updated?: string;
    deleted?: string;
    archived?: string;
    saved?: string;
  }>;
};

const keywordExamples = [
  "dating, confidence, communication, first date",
  "business, first clients, pricing, marketing",
  "CV, interview, job search, motivation letter",
  "documents, forms, admin help, official message",
  "cooking, recipe, beginner, step by step",
  "religion, faith, spiritual questions, practices",
];

export default async function ExpertServicesPage({
  searchParams,
}: ExpertServicesPageProps) {
  const { user } = await requireRole(["expert", "admin"]);
  const resolvedSearchParams = searchParams ? await searchParams : {};

  const expert = await prisma.expertProfile.findUnique({
    where: {
      userId: user.id,
    },
    include: {
      user: true,
      services: {
        include: {
          category: true,
          subcategory: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      },
      availability: {
        where: {
          endTime: {
            gte: new Date(),
          },
          isActive: true,
        },
        take: 12,
        orderBy: {
          startTime: "asc",
        },
      },
      bookings: {
        where: {
          status: {
            in: ["PENDING", "PAID", "CONFIRMED", "COMPLETED"],
          },
        },
        select: {
          id: true,
          serviceId: true,
          priceCents: true,
          providerNetCents: true,
          platformFeeCents: true,
          status: true,
        },
        take: 200,
      },
    },
  });

  if (!expert) {
    redirect("/become-expert");
  }

  const activeServices = expert.services.filter((service) => service.isActive);
  const inactiveServices = expert.services.filter((service) => !service.isActive);

  const lowestPrice =
    activeServices.length > 0
      ? Math.min(...activeServices.map((service) => service.priceCents))
      : expert.services.length > 0
        ? Math.min(...expert.services.map((service) => service.priceCents))
        : null;

  const highestPrice =
    expert.services.length > 0
      ? Math.max(...expert.services.map((service) => service.priceCents))
      : null;

  const averagePrice =
    expert.services.length > 0
      ? Math.round(
          expert.services.reduce((sum, service) => sum + service.priceCents, 0) /
            expert.services.length,
        )
      : null;

  const estimatedActiveProviderNet = activeServices.reduce((sum, service) => {
    const pricing = calculatePricingBreakdown(service.priceCents);
    return sum + pricing.providerNetCents;
  }, 0);

  const completedRevenueCents = expert.bookings
    .filter((booking) => booking.status === "COMPLETED")
    .reduce((sum, booking) => sum + getProviderNetCents(booking), 0);

  const offerHealth = calculateOfferHealth({
    activeServicesCount: activeServices.length,
    servicesCount: expert.services.length,
    hasOpenSlots: expert.availability.length > 0,
    hasStripe: Boolean(expert.stripeAccountId),
    hasStrongDescriptions: expert.services.some(
      (service) => service.description.length >= 80,
    ),
    hasSearchTags: expert.services.some((service) => service.tags.length > 0),
  });

  const isBookable =
    activeServices.length > 0 &&
    expert.availability.length > 0 &&
    Boolean(expert.stripeAccountId);

  const bestService = getBestService({
    services: expert.services,
    bookings: expert.bookings,
  });

  return (
    <main>
      <section className="relative overflow-hidden border-b border-[var(--border)]">
        <div className="surface-grid absolute inset-0 opacity-50" />
        <div className="absolute left-[-160px] top-[-180px] h-[420px] w-[420px] rounded-full bg-[var(--primary)]/10 blur-3xl" />
        <div className="absolute bottom-[-220px] right-[-160px] h-[420px] w-[420px] rounded-full bg-[var(--accent)]/10 blur-3xl" />

        <div className="relative p-6 md:p-8 lg:p-10">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <Link
                href="/expert"
                className="inline-flex items-center gap-2 text-sm font-bold text-[var(--primary-dark)]"
              >
                <ArrowLeft size={16} />
                Back to dashboard
              </Link>

              <PageNotice searchParams={resolvedSearchParams} />

              <div className="mt-6">
                <Badge variant="primary">
                  <WalletCards size={14} />
                  Bookable offers
                </Badge>
              </div>

              <h1 className="heading-lg mt-5 max-w-4xl text-balance">
                Create help offers for real problems people search for.
              </h1>

              <p className="mt-4 max-w-2xl text-lg leading-8 text-[var(--muted-foreground)]">
                Each offer should explain the problem, the type of help, and the
                result the buyer gets after a short call. Categories stay clean,
                while tags make your offer easier to find.
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                <Badge variant={isBookable ? "success" : "accent"}>
                  {isBookable ? (
                    <>
                      <CheckCircle2 size={14} />
                      Bookable
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={14} />
                      Setup needed
                    </>
                  )}
                </Badge>

                <Badge variant={expert.stripeAccountId ? "success" : "accent"}>
                  <WalletCards size={14} />
                  {expert.stripeAccountId ? "Stripe connected" : "Stripe missing"}
                </Badge>

                <Badge variant={expert.availability.length > 0 ? "success" : "accent"}>
                  <CalendarDays size={14} />
                  {expert.availability.length} open slots
                </Badge>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <ButtonLink href={`/experts/${expert.id}`}>
                <Eye size={18} />
                Public profile
              </ButtonLink>

              <ButtonLink href="/expert/availability" variant="secondary">
                Availability
                <ArrowRight size={18} />
              </ButtonLink>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <MiniStat
              icon={Layers3}
              label="Active offers"
              value={String(activeServices.length)}
              text="Visible to buyers"
            />

            <MiniStat
              icon={FileText}
              label="Inactive"
              value={String(inactiveServices.length)}
              text="Hidden offers"
            />

            <MiniStat
              icon={Euro}
              label="Starting price"
              value={lowestPrice ? formatMoney(lowestPrice) : "—"}
              text="Lowest offer"
            />

            <MiniStat
              icon={Target}
              label="Offer health"
              value={`${offerHealth}%`}
              text="Readiness"
            />

            <MiniStat
              icon={WalletCards}
              label="Completed net"
              value={formatMoney(completedRevenueCents)}
              text="From finished calls"
            />
          </div>
        </div>
      </section>

      <section className="p-6 md:p-8 lg:p-10">
        <div className="grid gap-6">
          {!isBookable ? <SetupNeededCard expert={expert} activeServices={activeServices.length} /> : <ReadyCard expertId={expert.id} />}

          <div className="grid gap-6 xl:grid-cols-[0.84fr_1.16fr] xl:items-start">
            <div className="grid gap-6">
              <Card className="p-5 md:p-6">
                <Badge variant="accent">
                  <Sparkles size={14} />
                  Offer performance
                </Badge>

                <h2 className="mt-4 text-3xl font-black tracking-[-0.05em]">
                  Pricing overview
                </h2>

                <p className="mt-3 text-sm font-bold leading-6 text-[var(--muted-foreground)]">
                  Use this to understand your offer range and estimated helper
                  net after SkillDrop commission.
                </p>

                <div className="mt-6 grid gap-3">
                  <InfoRow label="Lowest price" value={lowestPrice ? formatMoney(lowestPrice) : "—"} />
                  <InfoRow label="Highest price" value={highestPrice ? formatMoney(highestPrice) : "—"} />
                  <InfoRow label="Average price" value={averagePrice ? formatMoney(averagePrice) : "—"} />
                  <InfoRow label="Estimated active net" value={formatMoney(estimatedActiveProviderNet)} strong />
                  <InfoRow label="Best offer" value={bestService?.title ?? "Not enough data"} />
                </div>
              </Card>

              <Card soft className="p-5 md:p-6">
                <Badge variant="primary">
                  <BadgeCheck size={14} />
                  Good offer checklist
                </Badge>

                <div className="mt-5 grid gap-3">
                  <CheckRow done={activeServices.length > 0} text="At least one active offer" />
                  <CheckRow done={expert.services.some((service) => service.title.length >= 8)} text="Clear problem-focused title" />
                  <CheckRow done={expert.services.some((service) => service.description.length >= 80)} text="Detailed description" />
                  <CheckRow done={expert.services.some((service) => service.tags.length > 0)} text="Search tags added" />
                  <CheckRow done={expert.services.some((service) => service.durationMinutes === 15 || service.durationMinutes === 30)} text="Short, easy-to-book duration" />
                  <CheckRow done={expert.availability.length > 0} text="Open availability added" />
                  <CheckRow done={Boolean(expert.stripeAccountId)} text="Stripe payouts connected" />
                </div>
              </Card>

              <Card className="border-[var(--warning)]/20 bg-[var(--warning-soft)] p-5 md:p-6">
                <Badge variant="accent">
                  <ShieldCheck size={14} />
                  Safety boundary
                </Badge>

                <h2 className="mt-4 text-2xl font-black tracking-[-0.04em]">
                  Broad help does not mean unsafe help.
                </h2>

                <p className="mt-3 text-sm font-bold leading-6 text-[var(--muted-foreground)]">
                  Your offers can cover relationships, faith, business, cooking,
                  documents, tech or life advice — but they must not include
                  illegal help, fake documents, scams, manipulation, harmful
                  instructions or guaranteed medical, legal or financial
                  outcomes.
                </p>
              </Card>

              <Card className="p-5 md:p-6">
                <Badge variant="primary">
                  <Search size={14} />
                  Search discovery
                </Badge>

                <h2 className="mt-4 text-2xl font-black tracking-[-0.04em]">
                  Buyers search by problems, not by professional titles.
                </h2>

                <p className="mt-3 text-sm font-bold leading-6 text-[var(--muted-foreground)]">
                  Add category, subcategory, help type and tags so SkillDrop can
                  connect a buyer problem with the right helper.
                </p>

                <div className="mt-5 grid gap-3">
                  {keywordExamples.map((example) => (
                    <div
                      key={example}
                      className="rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] p-3 text-sm font-bold text-[var(--muted-foreground)]"
                    >
                      {example}
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            <div className="grid gap-6">
              <details
                id="add-offer"
                className="group rounded-[28px] border border-[var(--border)] bg-[var(--card)] p-4 shadow-[var(--shadow-sm)] backdrop-blur"
                open={expert.services.length === 0}
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-[22px] p-2">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary-dark)]">
                      <Plus size={21} />
                    </div>

                    <div>
                      <p className="font-bold tracking-[-0.02em] text-[var(--foreground)]">
                        Add new offer
                      </p>
                      <p className="mt-1 text-sm font-medium text-[var(--muted-foreground)]">
                        Create one clear service people can find and book.
                      </p>
                    </div>
                  </div>

                  <div className="btn btn-primary hidden sm:inline-flex">
                    Add offer
                    <ArrowRight size={17} />
                  </div>
                </summary>

                <div className="mt-5 border-t border-[var(--border)] pt-5">
                  <div className="mb-5 rounded-[24px] border border-[var(--border)] bg-[var(--primary-soft)] p-5">
                    <div className="flex gap-3">
                      <Lightbulb
                        size={20}
                        className="mt-1 shrink-0 text-[var(--primary-dark)]"
                      />

                      <div>
                        <p className="font-bold text-[var(--primary-dark)]">
                          Build your offer around one buyer problem
                        </p>

                        <p className="mt-1 text-sm font-medium leading-6 text-[var(--primary-dark)]/80">
                          Good offers answer: what problem you solve, who it is
                          for, what happens during the call, and what result the
                          buyer gets.
                        </p>
                      </div>
                    </div>
                  </div>

                  <ServiceForm action={createServiceAction} />
                </div>
              </details>

              <Card className="p-5 md:p-6">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                  <div>
                    <Badge variant="primary">
                      <Layers3 size={14} />
                      Your offers
                    </Badge>

                    <h2 className="mt-5 text-3xl font-black tracking-[-0.05em]">
                      Services list
                    </h2>

                    <p className="mt-3 max-w-2xl leading-7 text-[var(--muted-foreground)]">
                      Active offers appear on your public profile. Edit category,
                      subcategory, help type and tags to improve matching.
                    </p>
                  </div>

                  <Badge>{expert.services.length} total</Badge>
                </div>

                <div className="mt-7 grid gap-4">
                  {expert.services.length > 0 ? (
                    expert.services.map((service) => (
                      <ServiceCard
                        key={service.id}
                        service={{
                          id: service.id,
                          title: service.title,
                          description: service.description,
                          durationMinutes: service.durationMinutes,
                          price: service.priceCents / 100,
                          isActive: service.isActive,
                          categoryName: service.category?.name ?? "Category",
                          categorySlug: service.category?.slug ?? null,
                          subcategoryName: service.subcategory?.name ?? null,
                          subcategorySlug: service.subcategory?.slug ?? null,
                          helpType: service.helpType,
                          tags: service.tags,
                        }}
                      />
                    ))
                  ) : (
                    <EmptyState />
                  )}
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function ServiceCard({
  service,
}: {
  service: {
    id: string;
    title: string;
    description: string;
    durationMinutes: number;
    price: number;
    isActive: boolean;
    categoryName: string;
    categorySlug?: string | null;
    subcategoryName?: string | null;
    subcategorySlug?: string | null;
    helpType?: string | null;
    tags: string[];
  };
}) {
  return (
    <div className="rounded-[26px] border border-[var(--border)] bg-[var(--card-soft)] p-4 transition hover:border-[var(--border-strong)] hover:bg-[var(--background-soft)] hover:shadow-[var(--shadow-sm)]">
      <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={service.isActive ? "success" : "accent"}>
              {service.isActive ? "Active" : "Inactive"}
            </Badge>
            <Badge>{service.categoryName}</Badge>
            {service.subcategoryName ? <Badge>{service.subcategoryName}</Badge> : null}
            <Badge>{helpTypeLabels[service.helpType ?? "ADVICE"] ?? "Advice"}</Badge>
            <Badge>
              <Clock3 size={14} />
              {service.durationMinutes} min
            </Badge>
          </div>

          <p className="mt-4 text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
            Buyer problem / offer
          </p>

          <h3 className="mt-2 text-xl font-black tracking-[-0.03em] text-[var(--foreground)]">
            {service.title}
          </h3>

          <p className="mt-2 line-clamp-3 text-sm font-medium leading-6 text-[var(--muted-foreground)]">
            {service.description}
          </p>

          {service.tags.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {service.tags.slice(0, 8).map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--background-soft)] px-3 py-1 text-xs font-bold text-[var(--muted-foreground)]"
                >
                  <Tags size={12} />
                  {tag}
                </span>
              ))}
            </div>
          ) : null}

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <MiniInfo icon={Target} label="Purpose" value="Problem-focused" />
            <MiniInfo icon={Clock3} label="Duration" value={`${service.durationMinutes} min`} />
            <MiniInfo icon={Euro} label="Price" value={`€${service.price}`} />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 lg:justify-end">
          <ServiceEditModal service={service} />

          <form action={toggleServiceStatusAction}>
            <input type="hidden" name="serviceId" value={service.id} />
            <button type="submit" className="btn btn-secondary">
              <Power size={17} />
              {service.isActive ? "Off" : "On"}
            </button>
          </form>

          <form action={deleteServiceAction}>
            <input type="hidden" name="serviceId" value={service.id} />
            <button type="submit" className="btn btn-secondary">
              <Trash2 size={17} />
              Delete
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function PageNotice({
  searchParams,
}: {
  searchParams: {
    error?: string;
    created?: string;
    updated?: string;
    deleted?: string;
    archived?: string;
    saved?: string;
  };
}) {
  if (searchParams.created) {
    return <Notice type="success" text="Offer created successfully." />;
  }

  if (searchParams.updated) {
    return <Notice type="success" text="Offer updated successfully." />;
  }

  if (searchParams.deleted) {
    return <Notice type="success" text="Offer deleted successfully." />;
  }

  if (searchParams.archived) {
    return <Notice type="success" text="This offer has bookings, so it was archived instead of deleted." />;
  }

  if (searchParams.saved) {
    return <Notice type="success" text="Changes saved successfully." />;
  }

  if (searchParams.error) {
    return <Notice type="danger" text={formatServiceError(searchParams.error)} />;
  }

  return null;
}

function Notice({ type, text }: { type: "success" | "danger"; text: string }) {
  const className =
    type === "success"
      ? "mt-6 rounded-2xl border border-[var(--success)]/20 bg-[var(--success-soft)] p-4 text-sm font-bold text-[var(--success)]"
      : "mt-6 rounded-2xl border border-[var(--danger)]/20 bg-[var(--danger-soft)] p-4 text-sm font-bold text-[var(--danger)]";

  return <div className={className}>{text}</div>;
}

function SetupNeededCard({
  expert,
  activeServices,
}: {
  expert: { availability: { id: string }[]; stripeAccountId: string | null };
  activeServices: number;
}) {
  return (
    <Card className="border-[var(--warning)]/20 bg-[var(--warning-soft)] p-5 md:p-6">
      <div className="grid gap-5 lg:grid-cols-[auto_1fr_auto] lg:items-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--background-soft)] text-[var(--warning)]">
          <Lightbulb size={24} />
        </div>

        <div>
          <h2 className="text-2xl font-black tracking-[-0.04em]">
            Your offers are not fully ready for paid bookings yet.
          </h2>

          <p className="mt-2 leading-7 text-[var(--muted-foreground)]">
            You need at least one active offer, open availability and Stripe
            payouts connected before buyers can book smoothly.
          </p>
        </div>

        <ButtonLink
          href={
            activeServices === 0
              ? "#add-offer"
              : expert.availability.length === 0
                ? "/expert/availability"
                : "/expert/earnings"
          }
        >
          Continue setup
          <ArrowRight size={18} />
        </ButtonLink>
      </div>
    </Card>
  );
}

function ReadyCard({ expertId }: { expertId: string }) {
  return (
    <Card className="border-[var(--success)]/20 bg-[var(--success-soft)] p-5 md:p-6">
      <div className="grid gap-5 lg:grid-cols-[auto_1fr_auto] lg:items-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--background-soft)] text-[var(--success)]">
          <CheckCircle2 size={24} />
        </div>

        <div>
          <h2 className="text-2xl font-black tracking-[-0.04em]">
            Your profile can accept bookings.
          </h2>

          <p className="mt-2 leading-7 text-[var(--muted-foreground)]">
            You have active offers, open slots and payout setup. Keep your offers
            clear, searchable and easy to book.
          </p>
        </div>

        <ButtonLink href={`/experts/${expertId}`}>
          View profile
          <Eye size={18} />
        </ButtonLink>
      </div>
    </Card>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
  text,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  text: string;
}) {
  return (
    <Card soft className="p-5">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary-dark)]">
        <Icon size={20} />
      </div>

      <p className="mt-4 text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
        {label}
      </p>

      <p className="mt-2 text-3xl font-bold tracking-[-0.04em] text-[var(--foreground)]">
        {value}
      </p>

      <p className="mt-1 text-sm font-medium text-[var(--muted-foreground)]">
        {text}
      </p>
    </Card>
  );
}

function MiniInfo({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--background-soft)] p-3">
      <div className="flex items-center gap-2 text-[var(--primary-dark)]">
        <Icon size={15} />
        <p className="text-xs font-bold uppercase tracking-[0.12em]">
          {label}
        </p>
      </div>

      <p className="mt-2 text-sm font-bold text-[var(--foreground)]">
        {value}
      </p>
    </div>
  );
}

function InfoRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] p-3">
      <p className="text-sm font-medium text-[var(--muted-foreground)]">
        {label}
      </p>

      <p
        className={
          strong
            ? "text-right text-sm font-bold text-[var(--primary-dark)]"
            : "text-right text-sm font-bold text-[var(--foreground)]"
        }
      >
        {value}
      </p>
    </div>
  );
}

function CheckRow({ done, text }: { done: boolean; text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] p-3">
      <div
        className={
          done
            ? "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--success-soft)] text-[var(--success)]"
            : "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]"
        }
      >
        {done ? <CheckCircle2 size={16} /> : <Clock3 size={16} />}
      </div>

      <p className="text-sm font-medium text-[var(--muted-foreground)]">
        {text}
      </p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-[26px] border border-dashed border-[var(--border-strong)] bg-[var(--card-soft)] p-8 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary-dark)]">
        <FileText size={24} />
      </div>

      <h3 className="mt-5 text-2xl font-bold tracking-[-0.04em] text-[var(--foreground)]">
        No offers yet
      </h3>

      <p className="mx-auto mt-3 max-w-md leading-7 text-[var(--muted-foreground)]">
        Open “Add new offer” and create your first bookable service around one
        clear buyer problem.
      </p>
    </div>
  );
}

function calculateOfferHealth({
  activeServicesCount,
  servicesCount,
  hasOpenSlots,
  hasStripe,
  hasStrongDescriptions,
  hasSearchTags,
}: {
  activeServicesCount: number;
  servicesCount: number;
  hasOpenSlots: boolean;
  hasStripe: boolean;
  hasStrongDescriptions: boolean;
  hasSearchTags: boolean;
}) {
  const checks = [
    servicesCount > 0,
    activeServicesCount > 0,
    activeServicesCount >= 2,
    hasStrongDescriptions,
    hasSearchTags,
    hasOpenSlots,
    hasStripe,
  ];

  const completed = checks.filter(Boolean).length;

  return Math.round((completed / checks.length) * 100);
}

function getBestService({
  services,
  bookings,
}: {
  services: {
    id: string;
    title: string;
  }[];
  bookings: {
    serviceId: string | null;
    priceCents: number;
    providerNetCents: number | null;
    platformFeeCents: number | null;
    status: string;
  }[];
}) {
  if (services.length === 0) {
    return null;
  }

  const serviceRevenue = services.map((service) => {
    const revenue = bookings
      .filter(
        (booking) =>
          booking.serviceId === service.id && booking.status === "COMPLETED",
      )
      .reduce((sum, booking) => sum + getProviderNetCents(booking), 0);

    return {
      service,
      revenue,
    };
  });

  const best = serviceRevenue.sort((a, b) => b.revenue - a.revenue)[0];

  return best?.revenue > 0 ? best.service : null;
}

function getProviderNetCents(booking: {
  priceCents: number;
  providerNetCents?: number | null;
  platformFeeCents?: number | null;
}) {
  if (typeof booking.providerNetCents === "number") {
    return booking.providerNetCents;
  }

  if (typeof booking.platformFeeCents === "number") {
    return Math.max(booking.priceCents - booking.platformFeeCents, 0);
  }

  return calculatePricingBreakdown(booking.priceCents).providerNetCents;
}

function formatMoney(cents: number) {
  return formatMoneyFromCents(cents);
}

function formatServiceError(error: string) {
  if (error === "missing-required-fields") {
    return "Please fill in all required fields.";
  }

  if (error === "service-not-found") {
    return "Service was not found.";
  }

  if (error === "invalid-title" || error === "title-too-short") {
    return "Please enter a clearer offer title.";
  }

  if (error === "invalid-description" || error === "description-too-short") {
    return "Please describe your offer in more detail.";
  }

  if (error === "invalid-category") {
    return "Please choose a valid category.";
  }

  if (error === "invalid-subcategory") {
    return "Please choose a valid subcategory.";
  }

  if (error === "invalid-duration") {
    return "Please choose a valid duration.";
  }

  if (error === "invalid-price") {
    return "Please enter a valid price.";
  }

  if (error === "too-many-active-services") {
    return "You already have the maximum number of active offers.";
  }

  if (error === "service-has-active-bookings") {
    return "This offer has active future bookings. You can edit text, category and tags, but not duration or price.";
  }

  if (error === "not-signed-in") {
    return "Please sign in again.";
  }

  return "Something went wrong. Please try again.";
}
