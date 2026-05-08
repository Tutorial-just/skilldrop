import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Eye,
  Flag,
  Handshake,
  LockKeyhole,
  ShieldAlert,
  ShieldCheck,
  Star,
  WalletCards,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
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
          provider readiness, safe payments, dispute review and post-call
          feedback.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <ButtonLink href="/experts">
            Explore marketplace
            <ArrowRight size={18} />
          </ButtonLink>

          <ButtonLink href="/legal/terms" variant="secondary">
            Terms
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
              <ShieldCheck size={14} />
              Trust principle
            </Badge>

            <p className="mt-4 text-sm font-bold leading-6 text-muted">
              A marketplace becomes stronger when profiles are clear, payments
              are transparent, reviews are honest and disputes are handled
              fairly.
            </p>
          </Card>

          <Card className="p-5">
            <Badge variant="accent">
              <WalletCards size={14} />
              Payment safety
            </Badge>

            <p className="mt-4 text-sm font-bold leading-6 text-muted">
              Bookings are confirmed only after payment succeeds. Providers
              should complete payout setup before accepting paid calls.
            </p>
          </Card>

          <Card soft className="p-5">
            <Badge variant="primary">
              <LockKeyhole size={14} />
              MVP note
            </Badge>

            <p className="mt-4 text-sm font-bold leading-6 text-muted">
              For launch, keep expert approval and dispute handling manual until
              the marketplace has enough real activity and quality data.
            </p>
          </Card>
        </aside>

        <div className="grid gap-5 md:grid-cols-2">
          <SafetyCard
            icon={Eye}
            title="Clear profiles"
            text="Buyers can review provider profiles, skills, languages, services, prices and availability before booking."
          />

          <SafetyCard
            icon={WalletCards}
            title="Payout readiness"
            text="Providers should complete Stripe payout setup before accepting paid bookings."
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

          <SafetyCard
            icon={Handshake}
            title="Fair marketplace"
            text="Buyers and providers should both act honestly, communicate respectfully and attend scheduled calls on time."
          />

          <SafetyCard
            icon={LockKeyhole}
            title="Admin audit"
            text="Sensitive admin actions should be recorded in audit logs so moderation, refunds and role changes stay traceable."
          />
        </div>
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
              text="Keep the booking flow clear, handle payment states safely, record admin actions and review disputes fairly."
            />

            <Standard
              title="For launch"
              text="Start with manually reviewed experts, manual dispute handling and careful monitoring before scaling."
            />
          </div>
        </Card>
      </section>

      <section className="mt-10">
        <Card className="p-6 md:p-8">
          <Badge variant="danger">
            <XCircle size={14} />
            Not allowed
          </Badge>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Standard
              title="Scams or misleading services"
              text="Providers must not create fake offers, fake credentials, unrealistic promises or deceptive services."
            />

            <Standard
              title="Harassment or abuse"
              text="Users must not harass, threaten, insult, discriminate or pressure other users."
            />

            <Standard
              title="Illegal or dangerous help"
              text="SkillDrop should not be used for illegal activity, dangerous instructions or harmful services."
            />

            <Standard
              title="Review manipulation"
              text="Fake reviews, review pressure or attempts to manipulate trust signals should not be allowed."
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
                This MVP safety page should be reviewed before production
                launch.
              </p>
            </div>
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