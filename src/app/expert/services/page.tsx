import type { ReactNode } from "react";
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
  Globe2,
  Layers3,
  Lightbulb,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  WalletCards,
} from "lucide-react";

import { createProviderServiceAction } from "@/server/actions/expert.actions";
import { requireRole } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import {
  calculatePricingBreakdown,
  formatMoneyFromCents,
} from "@/config/pricing";
import { ServiceOfferCard } from "@/components/expert/service-offer-card";
import { PricingPreview } from "@/components/pricing/pricing-preview";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type ExpertServicesPageProps = {
  searchParams?: Promise<{
    error?: string;
    created?: string;
    updated?: string;
  }>;
};

const categoryOptions = [
  "Career & Jobs",
  "Documents & Admin Help",
  "Translation & Languages",
  "Moving Abroad",
  "Study & Applications",
  "Tech Help",
  "Business & Freelance",
  "Local Help",
  "Life Advice",
  "Family & Relationships",
  "Cooking & Daily Skills",
  "Psychology & Support",
  "Other Practical Help",
];

const durationOptions = [15, 30, 45, 60];

const offerTitleExamples = [
  "Review your CV and give clear next steps",
  "Help you understand an official document",
  "Practice a job interview with feedback",
  "Translate or correct an important message",
  "Help you prepare a university application",
  "Explain a website or coding problem",
];

const offerDescriptionChecklist = [
  "Who this offer is for",
  "What problem you help with",
  "What happens during the call",
  "What the buyer gets by the end",
  "What the buyer should prepare before the call",
];

const keywordExamples = [
  "CV, resume, interview, job search",
  "visa, documents, forms, admin help",
  "translation, message correction, language practice",
  "coding, website, tech help, IT support",
  "study application, motivation letter, university",
  "moving abroad, housing, local guidance, relocation",
];

export default async function ExpertServicesPage({
  searchParams,
}: ExpertServicesPageProps) {
  const { user } = await requireRole(["expert", "admin"]);
  const resolvedSearchParams = searchParams ? await searchParams : {};

  const email = user.email?.toLowerCase();

  if (!email) {
    redirect("/sign-in");
  }

  const expert = await prisma.expertProfile.findFirst({
    where: {
      user: {
        email,
      },
    },
    include: {
      user: true,
      services: {
        include: {
          category: true,
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

              {resolvedSearchParams.created ? (
                <div className="mt-6 rounded-2xl border border-[var(--success)]/20 bg-[var(--success-soft)] p-4 text-sm font-bold text-[var(--success)]">
                  Offer created successfully.
                </div>
              ) : null}

              {resolvedSearchParams.updated ? (
                <div className="mt-6 rounded-2xl border border-[var(--success)]/20 bg-[var(--success-soft)] p-4 text-sm font-bold text-[var(--success)]">
                  Offer updated successfully.
                </div>
              ) : null}

              {resolvedSearchParams.error ? (
                <div className="mt-6 rounded-2xl border border-[var(--danger)]/20 bg-[var(--danger-soft)] p-4 text-sm font-bold text-[var(--danger)]">
                  {formatServiceError(resolvedSearchParams.error)}
                </div>
              ) : null}

              <div className="mt-6">
                <Badge variant="primary">
                  <WalletCards size={14} />
                  Bookable offers
                </Badge>
              </div>

              <h1 className="heading-lg mt-5 max-w-4xl text-balance">
                Create offers people can understand, find and book.
              </h1>

              <p className="mt-4 max-w-2xl text-lg leading-8 text-[var(--muted-foreground)]">
                Each offer should solve one clear problem. Explain who it is for,
                what happens during the call and what the buyer gets by the end.
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
              text="Commercial readiness"
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
          {!isBookable ? (
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
                    You need at least one active offer, open availability and
                    Stripe payouts connected before buyers can book smoothly.
                  </p>
                </div>

                <ButtonLink
                  href={
                    activeServices.length === 0
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
          ) : (
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
                    You have active offers, open slots and payout setup. Keep
                    your offers clear, searchable and easy to book.
                  </p>
                </div>

                <ButtonLink href={`/experts/${expert.id}`}>
                  View profile
                  <Eye size={18} />
                </ButtonLink>
              </div>
            </Card>
          )}

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
                  <InfoRow
                    label="Lowest price"
                    value={lowestPrice ? formatMoney(lowestPrice) : "—"}
                  />

                  <InfoRow
                    label="Highest price"
                    value={highestPrice ? formatMoney(highestPrice) : "—"}
                  />

                  <InfoRow
                    label="Average price"
                    value={averagePrice ? formatMoney(averagePrice) : "—"}
                  />

                  <InfoRow
                    label="Estimated active net"
                    value={formatMoney(estimatedActiveProviderNet)}
                    strong
                  />

                  <InfoRow
                    label="Best offer"
                    value={bestService?.title ?? "Not enough data"}
                  />
                </div>
              </Card>

              <Card soft className="p-5 md:p-6">
                <Badge variant="primary">
                  <BadgeCheck size={14} />
                  Good offer checklist
                </Badge>

                <div className="mt-5 grid gap-3">
                  <CheckRow
                    done={activeServices.length > 0}
                    text="At least one active offer"
                  />
                  <CheckRow
                    done={expert.services.some(
                      (service) => service.title.length >= 8,
                    )}
                    text="Clear problem-focused title"
                  />
                  <CheckRow
                    done={expert.services.some(
                      (service) => service.description.length >= 80,
                    )}
                    text="Detailed description"
                  />
                  <CheckRow
                    done={expert.services.some(
                      (service) =>
                        service.durationMinutes === 15 ||
                        service.durationMinutes === 30,
                    )}
                    text="Short, easy-to-book duration"
                  />
                  <CheckRow
                    done={expert.availability.length > 0}
                    text="Open availability added"
                  />
                  <CheckRow
                    done={Boolean(expert.stripeAccountId)}
                    text="Stripe payouts connected"
                  />
                </div>
              </Card>

              <Card className="p-5 md:p-6">
                <Badge variant="accent">
                  <Lightbulb size={14} />
                  Tips for better offers
                </Badge>

                <div className="mt-5 grid gap-3">
                  <Tip text="Use titles that start with the buyer’s problem: “Review your CV”, “Understand a document”, “Fix a website issue”." />
                  <Tip text="Explain exactly what happens during the call and what result the buyer gets." />
                  <Tip text="Use words buyers might search for: visa, CV, coding, translation, interview, study, relocation." />
                  <Tip text="Start with simple 15 or 30 minute offers to reduce buyer hesitation." />
                  <Tip text="Create 2–3 focused offers instead of one vague offer for everything." />
                </div>
              </Card>

              <Card className="p-5 md:p-6">
                <Badge variant="primary">
                  <Search size={14} />
                  Search discovery
                </Badge>

                <h2 className="mt-4 text-2xl font-black tracking-[-0.04em]">
                  Your offer title and description help buyers find you.
                </h2>

                <p className="mt-3 text-sm font-bold leading-6 text-[var(--muted-foreground)]">
                  SkillDrop search reads your profile, skills, tags and service
                  details. Add simple words people would type when they need
                  help.
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
                          A good offer answers four questions: what problem do
                          you solve, who is it for, what happens during the
                          call, and what result does the buyer get?
                        </p>
                      </div>
                    </div>
                  </div>

                  <form action={createProviderServiceAction} className="grid gap-5">
                    <div className="grid gap-5 lg:grid-cols-2">
                      <Field label="Category" htmlFor="category-new">
                        <select
                          id="category-new"
                          name="category"
                          required
                          className="input mt-2"
                          defaultValue=""
                        >
                          <option value="" disabled>
                            Choose a category
                          </option>

                          {categoryOptions.map((category) => (
                            <option key={category} value={category}>
                              {category}
                            </option>
                          ))}
                        </select>
                      </Field>

                      <Field label="Offer title" htmlFor="title-new">
                        <input
                          id="title-new"
                          name="title"
                          type="text"
                          required
                          minLength={4}
                          maxLength={120}
                          className="input mt-2"
                          placeholder="Review your CV and give clear next steps"
                        />
                      </Field>
                    </div>

                    <ExampleBox
                      title="Strong offer title examples"
                      items={offerTitleExamples}
                    />

                    <Field label="Description" htmlFor="description-new">
                      <textarea
                        id="description-new"
                        name="description"
                        required
                        rows={6}
                        minLength={30}
                        maxLength={800}
                        className="mt-2 w-full rounded-[24px] border border-[var(--border)] bg-[var(--background-soft)] p-4 text-sm font-medium leading-7 outline-none transition focus:border-[var(--primary)]/50 focus:shadow-[0_0_0_4px_rgba(79,70,229,0.11)]"
                        placeholder="Explain who this is for, what problem you solve, what happens during the call, and what the buyer gets by the end. Add searchable words like CV, visa, documents, coding, interview, translation, study or relocation when relevant."
                      />
                    </Field>

                    <ExampleBox
                      title="Your offer description should mention"
                      items={offerDescriptionChecklist}
                    />

                    <div className="grid gap-5 md:grid-cols-[1fr_1fr_auto] md:items-end">
                      <Field label="Duration" htmlFor="duration-new">
                        <select
                          id="duration-new"
                          name="durationMinutes"
                          required
                          className="input mt-2"
                          defaultValue="30"
                        >
                          {durationOptions.map((duration) => (
                            <option key={duration} value={duration}>
                              {duration} minutes
                            </option>
                          ))}
                        </select>
                      </Field>

                      <Field label="Price in EUR" htmlFor="price-new">
                        <div className="relative mt-2">
                          <Euro
                            size={17}
                            className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]"
                          />

                          <input
                            id="price-new"
                            name="price"
                            type="number"
                            min="1"
                            step="1"
                            required
                            className="input pl-12"
                            placeholder="30"
                          />
                        </div>
                      </Field>

                      <button type="submit" className="btn btn-primary">
                        Create
                        <ArrowRight size={18} />
                      </button>
                    </div>

                    <PricingPreview inputId="price-new" />
                  </form>
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
                      Active offers appear on your public profile. Edit opens
                      inside the page and shows a price breakdown before saving.
                    </p>
                  </div>

                  <Badge>{expert.services.length} total</Badge>
                </div>

                <div className="mt-7 grid gap-4">
                  {expert.services.length > 0 ? (
                    expert.services.map((service) => (
                      <ServiceOfferCard
                        key={service.id}
                        service={{
                          id: service.id,
                          title: service.title,
                          description: service.description,
                          durationMinutes: service.durationMinutes,
                          price: service.priceCents / 100,
                          isActive: service.isActive,
                          categoryName: service.category?.name ?? "",
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

function MiniStat({
  icon: Icon,
  label,
  value,
  text,
}: {
  icon: typeof WalletCards;
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

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="text-sm font-bold text-[var(--foreground)]"
      >
        {label}
      </label>

      {children}
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

function Tip({ text }: { text: string }) {
  return (
    <div className="flex gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] p-4 text-sm font-medium leading-6 text-[var(--muted-foreground)]">
      <BadgeCheck size={17} className="mt-0.5 shrink-0 text-[var(--success)]" />
      {text}
    </div>
  );
}

function ExampleBox({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-[24px] border border-[var(--border)] bg-[var(--card-soft)] p-4">
      <div className="flex gap-3">
        <Lightbulb
          size={18}
          className="mt-0.5 shrink-0 text-[var(--accent)]"
        />

        <div>
          <p className="text-sm font-bold text-[var(--foreground)]">
            {title}
          </p>

          <div className="mt-3 grid gap-2">
            {items.map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-[var(--border)] bg-[var(--background-soft)] px-3 py-2 text-sm font-medium leading-6 text-[var(--muted-foreground)]"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
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
}: {
  activeServicesCount: number;
  servicesCount: number;
  hasOpenSlots: boolean;
  hasStripe: boolean;
  hasStrongDescriptions: boolean;
}) {
  const checks = [
    servicesCount > 0,
    activeServicesCount > 0,
    activeServicesCount >= 2,
    hasStrongDescriptions,
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

  if (error === "title-too-short") {
    return "Please enter a clearer offer title.";
  }

  if (error === "description-too-short") {
    return "Please describe your offer in at least 30 characters.";
  }

  if (error === "invalid-duration") {
    return "Please choose a valid duration.";
  }

  if (error === "invalid-price") {
    return "Please enter a valid price.";
  }

  if (error === "not-signed-in") {
    return "Please sign in again.";
  }

  return "Something went wrong. Please try again.";
}