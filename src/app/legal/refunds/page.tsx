import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  RefreshCcw,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export default function RefundsPage() {
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
          <RefreshCcw size={14} />
          Refund Policy
        </Badge>

        <h1 className="heading-lg mt-5 max-w-4xl text-balance">
          Refunds, cancellations and disputes
        </h1>

        <p className="mt-4 max-w-3xl text-lg leading-8 text-muted">
          This policy explains what happens when a booking is cancelled, missed
          or disputed. It is designed to protect both buyers and providers.
        </p>
      </section>

      <section className="mt-10 grid gap-5 md:grid-cols-2">
        <PolicyCard
          icon={Clock3}
          title="Pending bookings"
          text="If payment is not completed before the reservation expires, the booking can be released and the slot becomes available again."
        />

        <PolicyCard
          icon={CheckCircle2}
          title="Confirmed bookings"
          text="A booking becomes confirmed after successful payment. The buyer and provider should both attend the scheduled call."
        />

        <PolicyCard
          icon={XCircle}
          title="Buyer cancellation"
          text="If cancellation is allowed before the call starts, the booking may be cancelled according to platform rules. Refund eligibility depends on timing and status."
        />

        <PolicyCard
          icon={ShieldAlert}
          title="Provider no-show"
          text="If the provider does not attend the call, the buyer may open a dispute. SkillDrop may review the case and issue a refund when appropriate."
        />

        <PolicyCard
          icon={ShieldCheck}
          title="Buyer no-show"
          text="If the buyer does not attend a confirmed call, the provider may still be eligible for payment depending on the rules and evidence."
        />

        <PolicyCard
          icon={RefreshCcw}
          title="Disputed calls"
          text="SkillDrop may review call status, timestamps, messages, payment status and reports before deciding whether a refund is appropriate."
        />
      </section>

      <section className="mt-10">
        <Card className="p-6 md:p-8">
          <Badge variant="accent">
            <ShieldCheck size={14} />
            Recommended MVP rules
          </Badge>

          <div className="mt-6 grid gap-4">
            <Rule
              title="Before payment"
              text="No charge is made until checkout succeeds. If payment fails or expires, the booking is not confirmed."
            />

            <Rule
              title="Before call"
              text="Allow cancellation while the booking is still pending. For confirmed bookings, define a cancellation window before production launch."
            />

            <Rule
              title="After call"
              text="Completed calls are generally not automatically refundable unless there is a no-show, technical issue, abuse or serious service problem."
            />

            <Rule
              title="Manual review"
              text="For MVP launch, disputes should be reviewed manually by the admin before refunds are automated."
            />
          </div>
        </Card>
      </section>
    </main>
  );
}

function PolicyCard({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof Clock3;
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

function Rule({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-white/64 p-4">
      <h3 className="font-black tracking-[-0.02em]">{title}</h3>
      <p className="mt-2 text-sm font-bold leading-6 text-muted">{text}</p>
    </div>
  );
}