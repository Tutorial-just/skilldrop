import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  Eye,
  Flag,
  ShieldAlert,
  ShieldCheck,
  Star,
  WalletCards,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export default function SafetyPage() {
  return (
    <main className="container-page py-10 md:py-14">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm font-black text-[var(--primary-dark)]"
      >
        <ArrowLeft size={16} />
        Back home
      </Link>

      <section className="mt-8">
        <Badge variant="primary">
          <ShieldCheck size={14} />
          Safety & Trust
        </Badge>

        <h1 className="heading-lg mt-5 max-w-4xl text-balance">
          How SkillDrop builds trust
        </h1>

        <p className="mt-4 max-w-3xl text-lg leading-8 text-muted">
          SkillDrop is built around short practical calls, clear pricing,
          provider readiness and post-call reviews.
        </p>
      </section>

      <section className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        <SafetyCard
          icon={Eye}
          title="Clear profiles"
          text="Buyers can review provider profiles, skills, languages, services, prices and availability before booking."
        />

        <SafetyCard
          icon={WalletCards}
          title="Payout readiness"
          text="Providers should complete payout setup before accepting paid bookings."
        />

        <SafetyCard
          icon={Star}
          title="Reviews"
          text="Buyers can leave reviews after completed calls to help future buyers choose safely."
        />

        <SafetyCard
          icon={BadgeCheck}
          title="Earned verification"
          text="Verification is earned through successful calls and a minimum rating threshold."
        />

        <SafetyCard
          icon={Flag}
          title="Reports"
          text="Users should be able to report problematic behavior, no-shows, misleading services or abuse."
        />

        <SafetyCard
          icon={ShieldAlert}
          title="Disputes"
          text="Disputed bookings should be reviewed carefully before refunds, payouts or account actions."
        />
      </section>

      <section className="mt-10">
        <Card className="p-6 md:p-8">
          <Badge variant="success">
            <CheckCircle2 size={14} />
            Marketplace standards
          </Badge>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Standard
              title="For buyers"
              text="Be respectful, prepare your question, attend on time and leave honest feedback after the session."
            />

            <Standard
              title="For providers"
              text="Describe services clearly, attend on time, avoid misleading promises and keep availability updated."
            />

            <Standard
              title="For SkillDrop"
              text="Keep the booking flow clear, handle payment states safely and review disputes fairly."
            />

            <Standard
              title="For launch"
              text="Start with manually reviewed experts and manual dispute handling before scaling."
            />
          </div>
        </Card>
      </section>
    </main>
  );
}

function SafetyCard({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof ShieldCheck;
  title: string;
  text: string;
}) {
  return (
    <Card className="p-6 hover-lift">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary-dark)]">
        <Icon size={22} />
      </div>

      <h2 className="mt-5 text-2xl font-black tracking-[-0.04em]">{title}</h2>

      <p className="mt-3 text-sm font-bold leading-7 text-muted">{text}</p>
    </Card>
  );
}

function Standard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-white/64 p-4">
      <h3 className="font-black tracking-[-0.02em]">{title}</h3>
      <p className="mt-2 text-sm font-bold leading-6 text-muted">{text}</p>
    </div>
  );
}