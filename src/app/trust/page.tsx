import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  FileText,
  Flag,
  MessageCircle,
  RefreshCcw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Star,
  WalletCards,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const metadata = {
  title: "Trust Center | SkillDrop",
  description:
    "Learn how SkillDrop handles trust, safety, payments, refunds, reviews, disputes and action plans for short 1:1 calls.",
};

export default function TrustPage() {
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
          Trust Center
        </Badge>

        <h1 className="heading-lg mt-5 max-w-4xl text-balance">
          How SkillDrop keeps short calls useful and safer.
        </h1>

        <p className="mt-4 max-w-3xl text-lg leading-8 text-muted">
          SkillDrop is built for people who need practical human help with
          almost any problem. Trust comes from clear offers, transparent payment,
          safety boundaries, action plans, reviews, reports and admin moderation.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <ButtonLink href="/experts">
            Find a helper
            <ArrowRight size={18} />
          </ButtonLink>

          <ButtonLink href="/legal/safety" variant="secondary">
            Safety rules
          </ButtonLink>

          <ButtonLink href="/legal/refunds" variant="secondary">
            Refund policy
          </ButtonLink>
        </div>
      </section>

      <section className="mt-10 grid gap-6 lg:grid-cols-[0.82fr_1.18fr]">
        <aside className="grid content-start gap-5 lg:sticky lg:top-[96px]">
          <Card className="p-5">
            <Badge variant="success">
              <CheckCircle2 size={14} />
              Core promise
            </Badge>

            <p className="mt-4 text-sm font-bold leading-6 text-muted">
              The buyer should not just pay for time. The buyer should leave
              with a clearer understanding, a practical answer or next steps.
            </p>
          </Card>

          <Card className="p-5">
            <Badge variant="primary">
              <FileText size={14} />
              Action plans
            </Badge>

            <p className="mt-4 text-sm font-bold leading-6 text-muted">
              After a completed call, a helper can create a summary and next
              steps so the buyer keeps a useful result after the session.
            </p>
          </Card>

          <Card soft className="p-5">
            <Badge variant="accent">
              <ShieldAlert size={14} />
              Boundaries
            </Badge>

            <p className="mt-4 text-sm font-bold leading-6 text-muted">
              SkillDrop supports guidance, teaching and practical explanation,
              not illegal help, dangerous instructions or guaranteed outcomes.
            </p>
          </Card>
        </aside>

        <div className="grid gap-5 md:grid-cols-2">
          <TrustCard
            icon={MessageCircle}
            title="Clear problem before booking"
            text="Buyers are encouraged to describe the problem, desired result and what they already tried before choosing a time."
          />

          <TrustCard
            icon={WalletCards}
            title="Transparent payment"
            text="The buyer sees the helper price, SkillDrop fee and total before checkout. Payment is processed through Stripe."
          />

          <TrustCard
            icon={CalendarDays}
            title="Confirmed time slot"
            text="A booking is confirmed after successful payment. Pending reservations can expire if checkout is not completed."
          />

          <TrustCard
            icon={FileText}
            title="Post-call action plan"
            text="For completed calls, helpers can write what was discussed and what the buyer should do next."
          />

          <TrustCard
            icon={Star}
            title="Reviews and outcomes"
            text="Reviews help future buyers understand quality, clarity, professionalism and whether the problem was solved."
          />

          <TrustCard
            icon={Flag}
            title="Reports and disputes"
            text="Users can report problematic bookings. Disputed bookings can be reviewed before refunds, payouts or account actions."
          />

          <TrustCard
            icon={BadgeCheck}
            title="Helper readiness"
            text="Verified helpers, approved profiles, payout readiness, services, availability and reviews all help buyers choose."
          />

          <TrustCard
            icon={RefreshCcw}
            title="Refund flow"
            text="Refunds should go through the admin refund flow so booking status, Stripe records, notifications and audit logs stay aligned."
          />
        </div>
      </section>

      <section className="mt-10">
        <Card className="p-6 md:p-8">
          <Badge variant="primary">
            <Sparkles size={14} />
            The SkillDrop flow
          </Badge>

          <div className="mt-6 grid gap-4 md:grid-cols-4">
            <Step
              number="1"
              title="Describe the problem"
              text="The buyer searches or explains what they need help with."
            />

            <Step
              number="2"
              title="Book a short call"
              text="The buyer chooses a helper, service, time and pays securely."
            />

            <Step
              number="3"
              title="Talk to a real person"
              text="The call focuses on explanation, advice, teaching or practical guidance."
            />

            <Step
              number="4"
              title="Keep next steps"
              text="After completion, the buyer can receive an action plan and leave a review."
            />
          </div>
        </Card>
      </section>

      <section className="mt-10">
        <Card className="p-6 md:p-8">
          <Badge variant="danger">
            <ShieldAlert size={14} />
            What SkillDrop should not be used for
          </Badge>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Rule title="Illegal or fake documents" text="No fake papers, fraud, evasion, scams or illegal instructions." />
            <Rule title="Dangerous instructions" text="No instructions that could seriously harm a person, property or public safety." />
            <Rule title="Manipulation or exploitation" text="No harassment, coercion, relationship manipulation, abuse or exploitation." />
            <Rule title="Professional guarantees" text="No guaranteed legal, medical, financial, immigration or business outcomes unless handled by properly qualified professionals." />
            <Rule title="Hate or extremism" text="No hateful, extremist, discriminatory or radicalizing services." />
            <Rule title="Misleading services" text="No fake expertise, fake reviews, unrealistic promises or deceptive offers." />
          </div>
        </Card>
      </section>

      <section className="mt-10">
        <Card soft className="p-6 md:p-8">
          <div className="flex items-start gap-3">
            <BadgeCheck className="mt-1 h-5 w-5 text-[var(--success)]" />

            <div>
              <p className="text-sm font-black text-[var(--foreground)]">
                Last updated: June 2026
              </p>

              <p className="mt-1 text-sm font-bold leading-6 text-muted">
                This page explains the product trust model. It should be read
                together with Terms, Safety, Privacy and Refund Policy.
              </p>
            </div>
          </div>
        </Card>
      </section>
    </main>
  );
}

function TrustCard({
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

function Step({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-[22px] border border-[var(--border)] bg-white/64 p-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-sm font-bold text-[var(--primary-dark)]">
        {number}
      </div>

      <h3 className="mt-4 font-black tracking-[-0.02em]">{title}</h3>

      <p className="mt-2 text-sm font-bold leading-6 text-muted">{text}</p>
    </div>
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
