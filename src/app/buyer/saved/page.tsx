import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  Bookmark,
  CalendarDays,
  Clock3,
  Euro,
  Search,
  Star,
  Trash2,
} from "lucide-react";

import { unsaveExpertAction } from "@/server/actions/saved-expert.actions";
import { requireRole } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default async function BuyerSavedExpertsPage() {
  const { user } = await requireRole(["buyer", "admin"]);

  const email = user.email?.toLowerCase();

  if (!email) {
    redirect("/sign-in");
  }

  const buyer = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!buyer) {
    redirect("/sign-in");
  }

  const savedExperts = await prisma.savedExpert.findMany({
    where: {
      buyerId: buyer.id,
      expert: {
        status: "APPROVED",
      },
    },
    include: {
      expert: {
        include: {
          user: true,
          services: {
            where: {
              isActive: true,
            },
            orderBy: {
              priceCents: "asc",
            },
            take: 2,
          },
          availability: {
            where: {
              startTime: {
                gte: new Date(),
              },
              isBooked: false,
            },
            orderBy: {
              startTime: "asc",
            },
            take: 3,
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const availableSavedProviders = savedExperts.filter(
    (item) => item.expert.availability.length > 0,
  );

  const verifiedSavedProviders = savedExperts.filter(
    (item) => item.expert.isVerified,
  );

  return (
    <main>
      <section className="relative overflow-hidden border-b border-[var(--border)]">
        <div className="surface-grid absolute inset-0 opacity-40" />

        <div className="relative p-6 md:p-8 lg:p-10">
          <Link
            href="/buyer"
            className="inline-flex items-center gap-2 text-sm font-black text-[var(--primary-dark)]"
          >
            <ArrowLeft size={16} />
            Back to dashboard
          </Link>

          <div className="mt-6 grid gap-8 xl:grid-cols-[1fr_auto] xl:items-end">
            <div>
              <Badge variant="primary">
                <Bookmark size={14} />
                Saved providers
              </Badge>

              <h1 className="heading-lg mt-5 max-w-4xl text-balance">
                Your saved providers.
              </h1>

              <p className="mt-4 max-w-2xl text-lg leading-8 text-muted">
                Keep useful people in one place so you can come back and book
                them later.
              </p>
            </div>

            <ButtonLink href="/experts">
              <Search size={18} />
              Find more providers
            </ButtonLink>
          </div>

          <div className="mt-8 grid gap-3 md:grid-cols-3">
            <MetricCard
              label="Saved"
              value={String(savedExperts.length)}
              hint="Providers saved by you"
            />

            <MetricCard
              label="Available now"
              value={String(availableSavedProviders.length)}
              hint="With open slots"
            />

            <MetricCard
              label="Verified"
              value={String(verifiedSavedProviders.length)}
              hint="Trusted providers"
            />
          </div>
        </div>
      </section>

      <section className="p-6 md:p-8 lg:p-10">
        {savedExperts.length > 0 ? (
          <div className="grid gap-5">
            {savedExperts.map((saved) => (
              <SavedExpertCard key={saved.id} saved={saved} />
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[24px] bg-[var(--primary-soft)] text-[var(--primary-dark)]">
              <Bookmark size={28} />
            </div>

            <h2 className="mt-6 text-3xl font-black tracking-[-0.05em]">
              No saved providers yet.
            </h2>

            <p className="mx-auto mt-3 max-w-xl text-sm font-semibold leading-6 text-muted">
              When you find someone useful, save their profile and come back
              later to book a call.
            </p>

            <div className="mt-6">
              <ButtonLink href="/experts">
                Browse providers
                <Search size={18} />
              </ButtonLink>
            </div>
          </Card>
        )}
      </section>
    </main>
  );
}

function SavedExpertCard({
  saved,
}: {
  saved: {
    id: string;
    createdAt: Date;
    expert: {
      id: string;
      headline: string;
      bio: string;
      country: string | null;
      skills: string[];
      rating: number;
      totalReviews: number;
      totalSessions: number;
      isVerified: boolean;
      user: {
        name: string | null;
        email: string;
      };
      services: {
        id: string;
        title: string;
        priceCents: number;
        durationMinutes: number;
      }[];
      availability: {
        id: string;
        startTime: Date;
        endTime: Date;
      }[];
    };
  };
}) {
  const expert = saved.expert;
  const startingPrice = expert.services[0]?.priceCents ?? null;
  const nextSlot = expert.availability[0] ?? null;

  const providerName = expert.user.name ?? expert.user.email;
  const avatarLetter = (
    expert.user.name?.charAt(0) ||
    expert.user.email.charAt(0) ||
    "P"
  ).toUpperCase();

  return (
    <Card className="p-5 transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]">
      <div className="grid gap-5 lg:grid-cols-[1fr_230px] lg:items-start">
        <div className="flex gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[24px] bg-gradient-to-br from-[var(--primary)] to-[#8b5cf6] text-2xl font-black text-white shadow-sm">
            {avatarLetter}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap gap-2">
              {expert.isVerified ? (
                <Badge variant="success">
                  <BadgeCheck size={14} />
                  Verified
                </Badge>
              ) : (
                <Badge variant="accent">New provider</Badge>
              )}

              <Badge>
                <Star size={14} />
                {expert.rating ? expert.rating.toFixed(1) : "New"}
              </Badge>

              {startingPrice ? (
                <Badge variant="primary">
                  <Euro size={14} />
                  From {formatMoney(startingPrice)}
                </Badge>
              ) : null}
            </div>

            <h2 className="mt-4 text-2xl font-black tracking-[-0.04em]">
              {providerName}
            </h2>

            <p className="mt-2 text-lg font-black tracking-[-0.03em]">
              {expert.headline || "Practical help through short calls"}
            </p>

            <p className="mt-2 line-clamp-2 text-sm font-semibold leading-6 text-muted">
              {expert.bio || "This provider has not added a detailed bio yet."}
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {expert.skills.slice(0, 6).map((skill) => (
                <span
                  key={skill}
                  className="rounded-full border border-[var(--border)] bg-white/64 px-3 py-1 text-xs font-black text-[var(--muted-foreground)]"
                >
                  #{skill}
                </span>
              ))}

              {expert.skills.length === 0 ? (
                <span className="text-sm font-semibold text-muted">
                  No tags added yet.
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="grid gap-3 rounded-[24px] border border-[var(--border)] bg-white/64 p-4">
          <SideRow
            label="Next slot"
            value={nextSlot ? formatDateTime(nextSlot.startTime) : "No slots"}
          />

          <SideRow label="Sessions" value={String(expert.totalSessions)} />

          <SideRow label="Saved" value={formatShortDate(saved.createdAt)} />

          <Link href={`/experts/${expert.id}`} className="btn btn-primary">
            View profile
          </Link>

          <form action={unsaveExpertAction}>
            <input type="hidden" name="expertId" value={expert.id} />
            <input type="hidden" name="returnTo" value="/buyer/saved" />

            <button type="submit" className="btn btn-danger w-full">
              <Trash2 size={16} />
              Remove
            </button>
          </form>
        </div>
      </div>
    </Card>
  );
}

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <Card soft className="p-4">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
        {label}
      </p>

      <p className="mt-2 text-3xl font-black tracking-[-0.05em]">{value}</p>

      <p className="mt-1 text-sm font-semibold text-muted">{hint}</p>
    </Card>
  );
}

function SideRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-white/64 p-3">
      <p className="text-sm font-bold text-muted">{label}</p>
      <p className="text-right text-sm font-black">{value}</p>
    </div>
  );
}

function formatMoney(cents: number) {
  return `€${(cents / 100).toFixed(2).replace(".00", "")}`;
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatShortDate(date: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}