import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Clock3,
  HelpCircle,
  RefreshCcw,
  ShieldAlert,
  ShieldCheck,
  WalletCards,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
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
          This policy explains what happens when a booking is pending, paid,
          confirmed, cancelled, missed, completed or disputed. It is designed to
          protect both buyers and providers.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <ButtonLink href="/experts">
            Explore marketplace
            <ArrowRight size={18} />
          </ButtonLink>

          <ButtonLink href="/legal/terms" variant="secondary">
            Terms
          </ButtonLink>

          <ButtonLink href="/legal/safety" variant="secondary">
            Safety rules
          </ButtonLink>
        </div>
      </section>

      <section className="mt-10 grid gap-6 lg:grid-cols-[0.82fr_1.18fr]">
        <aside className="grid content-start gap-5 lg:sticky lg:top-[96px]">
          <Card className="p-5">
            <Badge variant="success">
              <ShieldCheck size={14} />
              Key principle
            </Badge>

            <p className="mt-4 text-sm font-bold leading-6 text-muted">
              A booking is only confirmed after successful payment. Pending
              reservations can expire if checkout is not completed.
            </p>
          </Card>

          <Card className="p-5">
            <Badge variant="accent">
              <WalletCards size={14} />
              Stripe payments
            </Badge>

            <p className="mt-4 text-sm font-bold leading-6 text-muted">
              Payments and refunds are processed through Stripe. Some refunds
              may require manual review before they are issued.
            </p>
          </Card>

          <Card soft className="p-5">
            <Badge variant="primary">
              <HelpCircle size={14} />
              MVP note
            </Badge>

            <p className="mt-4 text-sm font-bold leading-6 text-muted">
              This is a practical MVP policy draft. Before public launch, adapt
              it to your company, market, payment setup and local legal rules.
            </p>
          </Card>
        </aside>

        <div className="grid gap-5">
          <PolicyCard
            icon={Clock3}
            title="Pending bookings"
            text="If payment is not completed before the reservation expires, the booking can be released and the slot becomes available again. No confirmed call exists until checkout succeeds."
          />

          <PolicyCard
            icon={CheckCircle2}
            title="Paid and confirmed bookings"
            text="After successful payment, the booking becomes confirmed. The buyer and provider should both attend the scheduled call and be ready at the agreed time."
          />

          <PolicyCard
            icon={XCircle}
            title="Buyer cancellation"
            text="If cancellation is allowed before the call starts, the booking may be cancelled according to platform rules. Refund eligibility depends on timing, booking status and dispute context."
          />

          <PolicyCard
            icon={ShieldAlert}
            title="Provider no-show"
            text="If the provider does not attend the call, the buyer may open a dispute. SkillDrop may review the case and issue a refund when appropriate."
          />

          <PolicyCard
            icon={ShieldCheck}
            title="Buyer no-show"
            text="If the buyer does not attend a confirmed call, the provider may still be eligible for payment depending on the rules, call timing and available evidence."
          />

          <PolicyCard
            icon={RefreshCcw}
            title="Disputed calls"
            text="SkillDrop may review booking status, payment status, call timing, reports, provider history and user messages before deciding whether a refund is appropriate."
          />

          <PolicyCard
            icon={BadgeCheck}
            title="Completed calls"
            text="Completed calls are generally not automatically refundable unless there is a no-show, major technical issue, abuse, fraud or serious mismatch between the service description and the call."
          />

          <PolicyCard
            icon={HelpCircle}
            title="Manual review"
            text="For the MVP, disputes should be reviewed manually by an admin before refunds are automated. This helps prevent abuse and protects both sides."
          />
        </div>
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
              text="No charge is made until checkout succeeds. If payment fails or expires, the booking is not confirmed and the time slot can become available again."
            />

            <Rule
              title="Pending booking"
              text="Pending bookings are temporary reservations. They should expire automatically if payment is not completed within the allowed time."
            />

            <Rule
              title="Confirmed booking"
              text="For confirmed bookings, define a clear cancellation window before production launch. Until then, use manual admin review for edge cases."
            />

            <Rule
              title="After the call"
              text="Completed calls are generally not refundable by default. Exceptions can include provider no-show, serious service issue, fraud, abuse or technical failure."
            />

            <Rule
              title="Disputes"
              text="Disputes should be reviewed using booking status, payment status, call room data, user reports, timestamps and provider history."
            />

            <Rule
              title="Refund execution"
              text="Refunds should be issued only through the admin refund flow so the platform records audit logs, updates booking status and notifies both users."
            />
          </div>
        </Card>
      </section>

      <section className="mt-10">
        <Card soft className="p-6 md:p-8">
          <div className="flex items-start gap-3">
            <BadgeCheck className="mt-1 h-5 w-5 text-[var(--success)]" />

            <div>
              <p className="text-sm font-black text-[var(--foreground)]">
                Last updated: May 2026
              </p>

              <p className="mt-1 text-sm font-bold leading-6 text-muted">
                This MVP refund policy should be reviewed before production
                launch.
              </p>
            </div>
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