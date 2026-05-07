import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  FileText,
  ShieldCheck,
  WalletCards,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export default function TermsPage() {
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
          <FileText size={14} />
          Terms of Service
        </Badge>

        <h1 className="heading-lg mt-5 max-w-4xl text-balance">
          SkillDrop Terms of Service
        </h1>

        <p className="mt-4 max-w-3xl text-lg leading-8 text-muted">
          These terms explain how SkillDrop works for buyers and providers. This
          page is a practical draft for your MVP and should be reviewed by a
          qualified legal professional before a real public launch.
        </p>
      </section>

      <section className="mt-10 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <aside className="grid content-start gap-5">
          <Card className="p-5">
            <Badge variant="success">
              <ShieldCheck size={14} />
              Key idea
            </Badge>

            <p className="mt-4 text-sm font-bold leading-6 text-muted">
              SkillDrop connects people who need short practical help with
              providers who offer paid 1:1 calls.
            </p>
          </Card>

          <Card className="p-5">
            <Badge variant="accent">
              <WalletCards size={14} />
              Payments
            </Badge>

            <p className="mt-4 text-sm font-bold leading-6 text-muted">
              Payments are handled through Stripe. A booking is confirmed only
              after checkout succeeds.
            </p>
          </Card>
        </aside>

        <div className="grid gap-5">
          <LegalSection
            title="1. About SkillDrop"
            text="SkillDrop is a marketplace for short 1:1 practical calls. Buyers can search providers, choose a service, select an available time and complete payment. Providers can create services, set prices, manage availability and receive bookings."
          />

          <LegalSection
            title="2. Accounts"
            text="Users are responsible for keeping their account information accurate and secure. Buyers should use the platform respectfully. Providers should keep their profile, services, prices and availability accurate."
          />

          <LegalSection
            title="3. Provider services"
            text="Providers are responsible for describing their services clearly. A service should explain what the buyer can expect from the call, the duration and the price. Providers should not promise outcomes they cannot reasonably deliver."
          />

          <LegalSection
            title="4. Bookings"
            text="A booking starts as pending when a buyer selects a service and time slot. The booking becomes confirmed only after payment succeeds. If payment is not completed in time, the reservation may expire and the slot may become available again."
          />

          <LegalSection
            title="5. Payments and fees"
            text="Buyers see the service price, SkillDrop fee and total before checkout. Providers see estimated earnings in their expert workspace. Final amounts can depend on payment provider fees, refunds, disputes or platform rules."
          />

          <LegalSection
            title="6. Cancellations, refunds and disputes"
            text="Refunds and disputes are handled according to the refund policy. SkillDrop may review disputed bookings, failed sessions, no-shows, abuse reports or payment issues."
          />

          <LegalSection
            title="7. Prohibited use"
            text="Users must not use SkillDrop for scams, harassment, illegal activities, dangerous advice, impersonation, spam or misleading services. SkillDrop may remove content, restrict accounts or cancel bookings when needed."
          />

          <LegalSection
            title="8. No guarantee of results"
            text="SkillDrop helps people access practical human help, but does not guarantee a specific result from any call. Buyers are responsible for deciding how to use the information they receive."
          />

          <LegalSection
            title="9. Changes"
            text="SkillDrop may update these terms as the product evolves. Continued use of the platform means the user accepts the updated terms."
          />

          <Card soft className="p-5">
            <div className="flex items-start gap-3">
              <BadgeCheck className="mt-1 h-5 w-5 text-[var(--success)]" />
              <p className="text-sm font-bold leading-6 text-muted">
                Last updated: May 2026. This MVP legal text should be reviewed
                before production launch.
              </p>
            </div>
          </Card>
        </div>
      </section>
    </main>
  );
}

function LegalSection({ title, text }: { title: string; text: string }) {
  return (
    <Card className="p-5 md:p-6 hover-lift">
      <h2 className="text-2xl font-black tracking-[-0.04em]">{title}</h2>
      <p className="mt-3 text-sm font-bold leading-7 text-muted">{text}</p>
    </Card>
  );
}