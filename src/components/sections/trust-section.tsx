import {
  ArrowRight,
  CheckCircle2,
  CreditCard,
  FileText,
  Flag,
  ShieldCheck,
  Star,
  WalletCards,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const helpItems = [
  "Clear total price before checkout",
  "Safety rules for buyers and helpers",
  "Reports and disputes for problematic calls",
  "Reviews after completed calls",
  "Action plans after completed calls",
  "Admin moderation for missing categories",
];

export function HelpSection() {
  return (
    <section className="section-page">
      <div className="container-page">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <Badge variant="primary">
              <ShieldCheck size={14} />
              Help layer
            </Badge>

            <h2 className="heading-xl mt-5 text-balance">
              Help is built into the booking flow.
            </h2>

            <p className="mt-5 text-lg leading-8 text-[var(--muted-foreground)]">
              SkillDrop is broad, but not chaotic. The platform has controlled
              categories, clear payment states, safety boundaries, refunds,
              reviews, reports and action plans.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/help">
                Visit Help Center
                <ArrowRight size={18} />
              </ButtonLink>

              <ButtonLink href="/legal/safety" variant="secondary">
                Safety rules
              </ButtonLink>
            </div>
          </div>

          <Card className="overflow-hidden p-6 md:p-8">
            <div className="grid gap-4 md:grid-cols-3">
              <HelpMetric icon={CreditCard} value="Stripe" label="secure checkout" />
              <HelpMetric icon={FileText} value="Action plan" label="next steps" />
              <HelpMetric icon={Flag} value="Reports" label="dispute review" />
            </div>

            <div className="mt-6 grid gap-3">
              {helpItems.map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] p-4 text-sm font-medium text-[var(--muted-foreground)]"
                >
                  <CheckCircle2
                    size={17}
                    className="shrink-0 text-[var(--success)]"
                  />
                  {item}
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <AudiencePanel
            badge="For buyers"
            title="You know what you pay before checkout."
            text="Choose a helper, read the offer, add your note, pick a time and review the total before payment."
            icon={WalletCards}
            href="/experts"
            action="Find help"
          />

          <AudiencePanel
            badge="For helpers"
            title="You offer clear services around problems you can solve."
            text="Create focused offers, set availability, respect safety rules and create action plans after completed calls."
            icon={Star}
            href="/sign-up?role=expert"
            action="Become a helper"
          />
        </div>
      </div>
    </section>
  );
}

function HelpMetric({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof ShieldCheck;
  value: string;
  label: string;
}) {
  return (
    <div className="rounded-[24px] border border-[var(--border)] bg-[var(--card-soft)] p-5">
      <Icon size={20} className="text-[var(--primary-dark)]" />

      <p className="mt-3 text-2xl font-black tracking-[-0.05em] text-[var(--foreground)]">
        {value}
      </p>

      <p className="mt-1 text-sm font-medium text-[var(--muted-foreground)]">
        {label}
      </p>
    </div>
  );
}

function AudiencePanel({
  badge,
  title,
  text,
  icon: Icon,
  href,
  action,
}: {
  badge: string;
  title: string;
  text: string;
  icon: typeof WalletCards;
  href: string;
  action: string;
}) {
  return (
    <Card className="p-6 md:p-8">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary-dark)]">
        <Icon size={24} />
      </div>

      <Badge variant="primary" className="mt-6">
        {badge}
      </Badge>

      <h3 className="mt-5 text-3xl font-black tracking-[-0.05em] text-[var(--foreground)]">
        {title}
      </h3>

      <p className="mt-4 leading-7 text-[var(--muted-foreground)]">{text}</p>

      <ButtonLink href={href} variant="secondary" className="mt-7">
        {action}
        <ArrowRight size={18} />
      </ButtonLink>
    </Card>
  );
}
