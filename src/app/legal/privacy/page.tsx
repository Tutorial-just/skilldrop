import Link from "next/link";
import {
  ArrowLeft,
  Database,
  Eye,
  Lock,
  Mail,
  ShieldCheck,
  Trash2,
  UserRound,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
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
          bookings, payments, notifications and marketplace trust.
        </p>
      </section>

      <section className="mt-10 grid gap-5 md:grid-cols-2">
        <PrivacyCard
          icon={UserRound}
          title="Account data"
          text="Name, email, role, avatar and basic account settings may be used to create and manage your SkillDrop account."
        />

        <PrivacyCard
          icon={Database}
          title="Marketplace data"
          text="Provider profiles, services, availability, bookings, reviews and saved experts are stored to run the marketplace."
        />

        <PrivacyCard
          icon={ShieldCheck}
          title="Payment data"
          text="Payment processing is handled by Stripe. SkillDrop should not store raw card details."
        />

        <PrivacyCard
          icon={Mail}
          title="Notifications"
          text="SkillDrop may use email or in-app notifications for booking updates, payment confirmations and review reminders."
        />

        <PrivacyCard
          icon={Eye}
          title="Safety review"
          text="Disputes, reports and booking history may be reviewed to protect buyers, providers and the platform."
        />

        <PrivacyCard
          icon={Trash2}
          title="Data requests"
          text="Users should be able to request account deletion or data access according to applicable laws before full production launch."
        />
      </section>

      <section className="mt-10">
        <Card soft className="p-5 md:p-6">
          <p className="text-sm font-bold leading-6 text-muted">
            This MVP privacy text is a practical placeholder. Before production,
            review it for GDPR, cookies, analytics, email providers, Stripe,
            storage, retention, deletion and user rights.
          </p>
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