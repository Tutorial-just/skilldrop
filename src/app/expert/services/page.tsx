import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Euro,
  Eye,
  FileText,
  Layers3,
  Plus,
  WalletCards,
} from "lucide-react";

import { createProviderServiceAction } from "@/server/actions/expert.actions";
import { requireRole } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import { ServiceOfferCard } from "@/components/expert/service-offer-card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type ExpertServicesPageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

const categoryOptions = [
  "Psychology & Support",
  "Translation & Languages",
  "Life Advice",
  "Career & Jobs",
  "Family & Relationships",
  "Documents & Admin Help",
  "Moving Abroad",
  "Business & Freelance",
  "Anything you want",
];

const durationOptions = [15, 30, 45, 60];

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
    },
  });

  if (!expert) {
    redirect("/become-expert");
  }

  const activeServices = expert.services.filter((service) => service.isActive);
  const inactiveServices = expert.services.filter((service) => !service.isActive);

  const lowestPrice =
    expert.services.length > 0
      ? Math.min(...expert.services.map((service) => service.priceCents))
      : null;

  return (
    <main>
      <section className="relative overflow-hidden border-b border-[var(--border)]">
        <div className="surface-grid absolute inset-0 opacity-50" />

        <div className="relative p-6 md:p-8 lg:p-10">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <Link
                href="/expert"
                className="inline-flex items-center gap-2 text-sm font-black text-[var(--primary-dark)]"
              >
                <ArrowLeft size={16} />
                Back to dashboard
              </Link>

              <div className="mt-6">
                <Badge variant="primary">
                  <WalletCards size={14} />
                  Offers
                </Badge>
              </div>

              <h1 className="heading-lg mt-5 max-w-4xl text-balance">
                Manage your bookable offers.
              </h1>

              <p className="mt-4 max-w-2xl text-lg leading-8 text-muted">
                Create focused services with clear pricing, duration and result.
              </p>
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

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <MiniStat label="Active offers" value={String(activeServices.length)} />
            <MiniStat
              label="Inactive offers"
              value={String(inactiveServices.length)}
            />
            <MiniStat
              label="Starting price"
              value={lowestPrice ? `€${lowestPrice / 100}` : "—"}
            />
          </div>
        </div>
      </section>

      <section className="p-6 md:p-8 lg:p-10">
        {resolvedSearchParams.error ? (
          <div className="mb-6 rounded-2xl border border-[var(--danger)]/20 bg-[var(--danger-soft)] p-4 text-sm font-bold text-[var(--danger)]">
            {resolvedSearchParams.error}
          </div>
        ) : null}

        <div className="grid gap-6">
          <details className="group rounded-[28px] border border-[var(--border)] bg-white/72 p-4 shadow-[var(--shadow-sm)] backdrop-blur">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-[22px] p-2">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary-dark)]">
                  <Plus size={21} />
                </div>

                <div>
                  <p className="font-black tracking-[-0.02em]">Add new offer</p>
                  <p className="mt-1 text-sm font-semibold text-muted">
                    Create a compact service people can book.
                  </p>
                </div>
              </div>

              <div className="btn btn-primary hidden sm:inline-flex">
                Add offer
                <ArrowRight size={17} />
              </div>
            </summary>

            <div className="mt-5 border-t border-[var(--border)] pt-5">
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
                      className="input mt-2"
                      placeholder="15-minute advice call"
                    />
                  </Field>
                </div>

                <Field label="Description" htmlFor="description-new">
                  <textarea
                    id="description-new"
                    name="description"
                    required
                    rows={3}
                    className="mt-2 w-full rounded-[24px] border border-[var(--border)] bg-white/88 p-4 text-sm leading-7 outline-none transition focus:border-[var(--primary)]/50 focus:shadow-[0_0_0_4px_rgba(79,70,229,0.11)]"
                    placeholder="Explain what happens during the call and what the client will get from it."
                  />
                </Field>

                <div className="grid gap-5 md:grid-cols-[1fr_1fr_auto] md:items-end">
                  <Field label="Duration" htmlFor="duration-new">
                    <select
                      id="duration-new"
                      name="durationMinutes"
                      required
                      className="input mt-2"
                      defaultValue="15"
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
                        className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-muted"
                      />

                      <input
                        id="price-new"
                        name="price"
                        type="number"
                        min="1"
                        step="1"
                        required
                        className="input pl-12"
                        placeholder="25"
                      />
                    </div>
                  </Field>

                  <button type="submit" className="btn btn-primary">
                    Create
                    <ArrowRight size={18} />
                  </button>
                </div>
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

                <p className="mt-3 max-w-2xl leading-7 text-muted">
                  Active offers appear on your public profile. Edit opens inside
                  the page and moves naturally with scroll.
                </p>
              </div>
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

          <div className="grid gap-4 md:grid-cols-3">
            <Tip text="Use clear titles like “Translate a document” or “30-min support call”." />
            <Tip text="Start with 15 or 30 minutes so clients can book easily." />
            <Tip text="Keep descriptions practical: what happens and what client gets." />
          </div>
        </div>
      </section>
    </main>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <Card soft className="p-5">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
        {label}
      </p>
      <p className="mt-2 text-3xl font-black tracking-[-0.04em]">{value}</p>
    </Card>
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
      <label htmlFor={htmlFor} className="text-sm font-black">
        {label}
      </label>
      {children}
    </div>
  );
}

function Tip({ text }: { text: string }) {
  return (
    <Card soft className="p-5">
      <div className="flex gap-3 text-sm font-bold leading-6 text-[var(--muted-foreground)]">
        <BadgeCheck size={17} className="mt-0.5 shrink-0 text-[var(--success)]" />
        {text}
      </div>
    </Card>
  );
}

function EmptyState() {
  return (
    <div className="rounded-[26px] border border-dashed border-[var(--border-strong)] bg-white/55 p-8 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary-dark)]">
        <FileText size={24} />
      </div>

      <h3 className="mt-5 text-2xl font-black tracking-[-0.04em]">
        No offers yet
      </h3>

      <p className="mx-auto mt-3 max-w-md leading-7 text-muted">
        Open “Add new offer” and create your first bookable service.
      </p>
    </div>
  );
}