import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Cookie,
  Database,
  Eye,
  Lock,
  Mail,
  ShieldCheck,
  Trash2,
  UserRound,
  WalletCards,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function PrivacyPage() {
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
          <Lock size={14} />
          Privacy Policy
        </Badge>

        <h1 className="heading-lg mt-5 max-w-4xl text-balance">
          SkillDrop Privacy Policy
        </h1>

        <p className="mt-4 max-w-3xl text-lg leading-8 text-muted">
          This page explains what data SkillDrop may use to operate accounts,
          helper profiles, bookings, payments, notifications, reviews, disputes
          and marketplace trust.
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
            Safety
          </ButtonLink>

          <ButtonLink href="/legal/refunds" variant="secondary">
            Refunds
          </ButtonLink>

          <ButtonLink href="/trust" variant="secondary">
            Trust center
          </ButtonLink>
        </div>
      </section>

      <section className="mt-10 grid gap-6 lg:grid-cols-[0.82fr_1.18fr]">
        <aside className="grid content-start gap-5 lg:sticky lg:top-[96px]">
          <Card className="p-5">
            <Badge variant="success">
              <ShieldCheck size={14} />
              Privacy principle
            </Badge>

            <p className="mt-4 text-sm font-bold leading-6 text-muted">
              SkillDrop should collect only the data needed to run accounts,
              bookings, payments, trust systems and support.
            </p>
          </Card>

          <Card className="p-5">
            <Badge variant="accent">
              <WalletCards size={14} />
              Payment data
            </Badge>

            <p className="mt-4 text-sm font-bold leading-6 text-muted">
              Payment processing is handled by Stripe. SkillDrop should not
              store raw card details.
            </p>
          </Card>

          <Card soft className="p-5">
            <Badge variant="primary">
              <BadgeCheck size={14} />
              Data rights
            </Badge>

            <p className="mt-4 text-sm font-bold leading-6 text-muted">
              Users may request account deletion or data access according to applicable
              privacy laws and platform procedures.
            </p>
          </Card>
        </aside>

        <div className="grid gap-5 md:grid-cols-2">
          <PrivacyCard
            icon={UserRound}
            title="Account data"
            text="Name, email, role, avatar and basic account settings may be used to create, authenticate and manage your SkillDrop account."
          />

          <PrivacyCard
            icon={Database}
            title="Marketplace data"
            text="Helper profiles, services, availability, bookings, reviews and saved experts are stored to run the marketplace."
          />

          <PrivacyCard
            icon={WalletCards}
            title="Payment data"
            text="Stripe handles payment processing. SkillDrop may store payment status, Stripe session identifiers and booking payment metadata."
          />

          <PrivacyCard
            icon={Mail}
            title="Notifications"
            text="SkillDrop may use email or in-app notifications for booking updates, payment confirmations, refunds, disputes and review reminders."
          />

          <PrivacyCard
            icon={Eye}
            title="Safety review"
            text="Disputes, reports, reviews, booking history and admin actions may be reviewed to protect buyers, helpers and the platform."
          />

          <PrivacyCard
            icon={Cookie}
            title="Cookies and local storage"
            text="SkillDrop may use cookies or local storage for authentication, theme preferences, security and basic product functionality."
          />

          <PrivacyCard
            icon={Lock}
            title="Security"
            text="SkillDrop should use reasonable technical and organizational measures to protect user data from unauthorized access."
          />

          <PrivacyCard
            icon={Trash2}
            title="Data requests"
            text="Users should be able to request account deletion or data access according to applicable laws before full production launch."
          />
        </div>
      </section>

      <section className="mt-10">
        <Card className="p-6 md:p-8">
          <Badge variant="primary">
            <Database size={14} />
            Data SkillDrop may process
          </Badge>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <PolicyRow
              title="User profile"
              text="Email, name, avatar, role, settings and account timestamps."
            />

            <PolicyRow
              title="Expert profile"
              text="Headline, biography, country, timezone, languages, skills, tags, verification status and payout readiness."
            />

            <PolicyRow
              title="Bookings"
              text="Buyer, helper, service, time slot, status, payment status, price, fees and call room information."
            />

            <PolicyRow
              title="Reviews"
              text="Ratings, comments, helpfulness, clarity, professionalism and recommendation signals."
            />

            <PolicyRow
              title="Notifications"
              text="Notification subject, message, type, read status and related metadata."
            />

            <PolicyRow
              title="Admin audit logs"
              text="Sensitive admin actions, entity IDs, admin email and metadata for moderation traceability."
            />
          </div>
        </Card>
      </section>

      <section className="mt-10">
        <Card className="p-6 md:p-8">
          <Badge variant="accent">
            <ShieldCheck size={14} />
            Why data is used
          </Badge>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <PolicyRow
              title="To run accounts"
              text="Create accounts, sign users in, route users to the right dashboard and protect access."
            />

            <PolicyRow
              title="To process bookings"
              text="Create reservations, confirm payment, show upcoming calls and manage cancellations."
            />

            <PolicyRow
              title="To support trust"
              text="Display reviews, verification badges, quality signals and admin moderation information."
            />

            <PolicyRow
              title="To handle disputes"
              text="Review booking status, payment status, reports, refund requests and related history."
            />

            <PolicyRow
              title="To send notifications"
              text="Inform users about booking updates, payments, refunds, disputes and review reminders."
            />

            <PolicyRow
              title="To improve the product"
              text="Understand platform usage, marketplace health and product issues during development."
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
                This privacy policy explains how SkillDrop may process data for accounts,
                bookings, payments, notifications, reviews, disputes, safety and marketplace
                operations.
              </p>
            </div>
          </div>
        </Card>
      </section>
    </main>
  );
}

function PrivacyCard({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof Lock;
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

function PolicyRow({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-white/64 p-4">
      <h3 className="font-black tracking-[-0.02em]">{title}</h3>
      <p className="mt-2 text-sm font-bold leading-6 text-muted">{text}</p>
    </div>
  );
}