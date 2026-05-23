import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  HelpCircle,
  Mail,
  MessageCircle,
  RefreshCcw,
  ShieldAlert,
  ShieldCheck,
  UserRound,
  WalletCards,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const supportEmail = "skilldrop.admin@gmail.com";

const contactTopics = [
  {
    icon: WalletCards,
    title: "Payment problem",
    text: "Use this for failed checkout, duplicate payment, missing confirmation or Stripe-related issues.",
  },
  {
    icon: RefreshCcw,
    title: "Refund request",
    text: "Use this if a call did not happen, the provider did not join, or you need help with a refund review.",
  },
  {
    icon: ShieldAlert,
    title: "Dispute or safety issue",
    text: "Use this for abuse, misleading services, no-show problems, fraud concerns or unsafe behavior.",
  },
  {
    icon: UserRound,
    title: "Account problem",
    text: "Use this for login issues, wrong role, profile problems, deleted data requests or account access.",
  },
  {
    icon: CalendarDays,
    title: "Booking issue",
    text: "Use this if your booking status looks wrong, your call room is missing, or the schedule is incorrect.",
  },
  {
    icon: MessageCircle,
    title: "General question",
    text: "Use this for product feedback, suggestions, partnership ideas or general SkillDrop questions.",
  },
];

const emailChecklist = [
  "Your SkillDrop account email",
  "Booking ID if the issue is about a booking",
  "Provider or buyer name if relevant",
  "A short description of what happened",
  "Screenshots if they help explain the issue",
];

export default function ContactPage() {
  const mailtoHref = `mailto:${supportEmail}?subject=${encodeURIComponent(
    "SkillDrop support request",
  )}`;

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
          <HelpCircle size={14} />
          Contact support
        </Badge>

        <div className="mt-6 grid gap-8 xl:grid-cols-[1fr_360px] xl:items-end">
          <div>
            <h1 className="heading-lg max-w-4xl text-balance">
              Need help with SkillDrop?
            </h1>

            <p className="mt-4 max-w-3xl text-lg leading-8 text-muted">
              Contact SkillDrop support for payment problems, refunds, disputes,
              account issues, booking problems or general product questions.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <a href={mailtoHref} className="btn btn-primary">
                Email support
                <Mail size={18} />
              </a>

              <ButtonLink href="/help" variant="secondary">
                Help center
              </ButtonLink>

              <ButtonLink href="/legal/safety" variant="secondary">
                Safety
              </ButtonLink>
            </div>
          </div>

          <Card className="p-5">
            <Badge variant="accent">
              <Mail size={14} />
              Support email
            </Badge>

            <p className="mt-4 break-all text-2xl font-black tracking-[-0.04em]">
              {supportEmail}
            </p>

            <p className="mt-3 text-sm font-bold leading-6 text-muted">
              Send a clear message with your account email and booking ID if the
              issue is related to a booking.
            </p>
          </Card>
        </div>
      </section>

      <section className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {contactTopics.map((topic) => (
          <ContactTopicCard key={topic.title} topic={topic} />
        ))}
      </section>

      <section className="mt-12 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Card className="p-6 md:p-8">
          <Badge variant="success">
            <BadgeCheck size={14} />
            What to include
          </Badge>

          <h2 className="mt-4 text-3xl font-black tracking-[-0.05em]">
            Help us solve it faster
          </h2>

          <p className="mt-3 text-sm font-bold leading-6 text-muted">
            When you contact support, include the details below so the issue can
            be understood quickly.
          </p>

          <div className="mt-6 grid gap-3">
            {emailChecklist.map((item) => (
              <ChecklistRow key={item} text={item} />
            ))}
          </div>
        </Card>

        <Card className="p-6 md:p-8">
          <Badge variant="primary">
            <Mail size={14} />
            Email template
          </Badge>

          <h2 className="mt-4 text-3xl font-black tracking-[-0.05em]">
            Copy this message
          </h2>

          <div className="mt-6 rounded-[24px] border border-[var(--border)] bg-white/64 p-5">
            <p className="text-sm font-bold leading-7 text-muted">
              Hello SkillDrop support,
              <br />
              <br />
              I need help with:
              <br />
              Account email:
              <br />
              Booking ID:
              <br />
              Problem:
              <br />
              What I expected:
              <br />
              Screenshots attached: yes / no
              <br />
              <br />
              Thank you.
            </p>
          </div>

          <div className="mt-5">
            <a href={mailtoHref} className="btn btn-primary">
              Open email
              <ArrowRight size={18} />
            </a>
          </div>
        </Card>
      </section>

      <section className="mt-12">
        <Card className="p-6 md:p-8">
          <Badge variant="accent">
            <ShieldCheck size={14} />
            Before contacting support
          </Badge>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <InfoBox
              title="Check your bookings"
              text="If your issue is about a call, first check your buyer or expert bookings page to see the latest booking status."
              href="/buyer/bookings"
              hrefText="Buyer bookings"
            />

            <InfoBox
              title="Read the refund policy"
              text="If your issue is about a refund, review the refund policy to understand how pending, confirmed, completed and disputed calls are handled."
              href="/legal/refunds"
              hrefText="Refund policy"
            />

            <InfoBox
              title="Review safety rules"
              text="If the issue is about abuse, misleading services, no-show or unsafe behavior, read the safety page and contact support."
              href="/legal/safety"
              hrefText="Safety page"
            />

            <InfoBox
              title="Use the help center"
              text="For general questions about how SkillDrop works, the help center explains buyer and provider workflows."
              href="/help"
              hrefText="Help center"
            />
          </div>
        </Card>
      </section>

      <section className="mt-12">
        <Card soft className="p-6 md:p-8">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <Badge variant="primary">
                <Mail size={14} />
                Support
              </Badge>

              <h2 className="mt-4 text-3xl font-black tracking-[-0.05em]">
                Contact us by email
              </h2>

              <p className="mt-3 max-w-2xl text-sm font-bold leading-6 text-muted">
                During the early launch, support is handled manually by email.
              </p>
            </div>

            <a href={mailtoHref} className="btn btn-primary">
              {supportEmail}
              <ArrowRight size={18} />
            </a>
          </div>
        </Card>
      </section>
    </main>
  );
}

function ContactTopicCard({
  topic,
}: {
  topic: {
    icon: typeof Mail;
    title: string;
    text: string;
  };
}) {
  const Icon = topic.icon;

  return (
    <Card className="p-6 hover-lift">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary-dark)]">
        <Icon size={22} />
      </div>

      <h2 className="mt-5 text-2xl font-black tracking-[-0.04em]">
        {topic.title}
      </h2>

      <p className="mt-3 text-sm font-bold leading-7 text-muted">
        {topic.text}
      </p>
    </Card>
  );
}

function ChecklistRow({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-white/64 p-4">
      <BadgeCheck size={18} className="shrink-0 text-[var(--success)]" />
      <p className="text-sm font-bold leading-6 text-muted">{text}</p>
    </div>
  );
}

function InfoBox({
  title,
  text,
  href,
  hrefText,
}: {
  title: string;
  text: string;
  href: string;
  hrefText: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-white/64 p-4">
      <h3 className="font-black tracking-[-0.02em]">{title}</h3>

      <p className="mt-2 text-sm font-bold leading-6 text-muted">{text}</p>

      <Link
        href={href}
        className="mt-4 inline-flex items-center gap-2 text-sm font-black text-[var(--primary-dark)]"
      >
        {hrefText}
        <ArrowRight size={15} />
      </Link>
    </div>
  );
}