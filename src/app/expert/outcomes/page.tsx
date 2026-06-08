import Link from "next/link";
import { redirect } from "next/navigation";
import { BookingStatus } from "@prisma/client";
import { ArrowRight, CheckCircle2, FileText, Sparkles } from "lucide-react";

import { requireRole } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export default async function ExpertOutcomesPage() {
  const { user } = await requireRole(["expert", "admin"]);

  const expert = await prisma.expertProfile.findFirst({
    where: {
      userId: user.id,
    },
    include: {
      bookings: {
        where: {
          status: BookingStatus.COMPLETED,
        },
        include: {
          buyer: true,
          service: true,
          outcome: true,
        },
        orderBy: {
          endTime: "desc",
        },
        take: 50,
      },
    },
  });

  if (!expert) {
    redirect("/become-expert");
  }

  const missingOutcomes = expert.bookings.filter((booking) => !booking.outcome);
  const completedOutcomes = expert.bookings.filter((booking) => booking.outcome);

  return (
    <main className="container-page py-8 md:py-10 lg:py-12">
      <Badge variant="primary">
        <FileText size={14} />
        Action plans
      </Badge>

      <h1 className="heading-lg mt-5 max-w-4xl text-balance">
        Turn completed calls into useful buyer outcomes
      </h1>

      <p className="mt-4 max-w-2xl text-lg leading-8 text-[var(--muted-foreground)]">
        A world-class marketplace does not end after the video call. Give buyers a clear problem summary, next steps and optional follow-up plan.
      </p>

      <section className="mt-8 grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <Card className="p-5 md:p-6">
          <Badge variant="accent">
            <Sparkles size={14} />
            Needs action plan
          </Badge>

          <div className="mt-6 grid gap-3">
            {missingOutcomes.length > 0 ? (
              missingOutcomes.map((booking) => <OutcomeRow key={booking.id} booking={booking} primary />)
            ) : (
              <EmptyState text="All recent completed calls have an action plan." />
            )}
          </div>
        </Card>

        <Card className="p-5 md:p-6">
          <Badge variant="success">
            <CheckCircle2 size={14} />
            Completed action plans
          </Badge>

          <div className="mt-6 grid gap-3">
            {completedOutcomes.length > 0 ? (
              completedOutcomes.map((booking) => <OutcomeRow key={booking.id} booking={booking} />)
            ) : (
              <EmptyState text="Completed action plans will appear here." />
            )}
          </div>
        </Card>
      </section>
    </main>
  );
}

function OutcomeRow({
  booking,
  primary = false,
}: {
  booking: {
    id: string;
    endTime: Date;
    buyer: { name: string | null; email: string };
    service: { title: string } | null;
    outcome: { id: string; isVisibleToBuyer: boolean } | null;
  };
  primary?: boolean;
}) {
  return (
    <Link href={`/expert/bookings/${booking.id}/outcome`} className="group">
      <div className="rounded-[22px] border border-[var(--border)] bg-[var(--card-soft)] p-4 transition group-hover:-translate-y-0.5 group-hover:bg-[var(--background-soft)] group-hover:shadow-[var(--shadow-sm)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-black tracking-[-0.02em]">{booking.service?.title ?? "Completed call"}</p>
            <p className="mt-1 text-sm font-semibold text-[var(--muted-foreground)]">
              Buyer: {booking.buyer.name ?? booking.buyer.email} · {formatShortDate(booking.endTime)}
            </p>
          </div>
          <Badge variant={primary ? "primary" : booking.outcome?.isVisibleToBuyer ? "success" : "accent"}>
            {primary ? "Create" : booking.outcome?.isVisibleToBuyer ? "Visible" : "Hidden"}
          </Badge>
        </div>

        <p className="mt-4 inline-flex items-center gap-2 text-sm font-black text-[var(--primary-dark)]">
          {primary ? "Create action plan" : "Edit action plan"}
          <ArrowRight size={15} />
        </p>
      </div>
    </Link>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-[22px] border border-dashed border-[var(--border)] bg-[var(--card-soft)] p-5 text-sm font-semibold text-[var(--muted-foreground)]">
      {text}
    </div>
  );
}

function formatShortDate(date: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
