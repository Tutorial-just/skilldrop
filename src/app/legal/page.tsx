import Link from "next/link";
import {
  ArrowRight,
  FileText,
  Lock,
  RefreshCcw,
  ShieldCheck,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

const legalPages = [
  {
    title: "Terms of Service",
    text: "Understand how SkillDrop works for buyers, providers, bookings, payments, reviews and marketplace rules.",
    href: "/legal/terms",
    icon: FileText,
  },
  {
    title: "Privacy Policy",
    text: "Learn what data SkillDrop may process for accounts, bookings, payments, reviews, disputes and notifications.",
    href: "/legal/privacy",
    icon: Lock,
  },
  {
    title: "Refund Policy",
    text: "Read how SkillDrop handles pending bookings, confirmed calls, completed sessions, disputes and refunds.",
    href: "/legal/refunds",
    icon: RefreshCcw,
  },
  {
    title: "Safety & Trust",
    text: "See the rules for safe behavior, reports, disputes, reviews, verification and marketplace trust.",
    href: "/legal/safety",
    icon: ShieldCheck,
  },
];

export default function LegalPage() {
  return (
    <main className="container-page py-10 md:py-14">
      <section>
        <Badge variant="primary">
          <ShieldCheck size={14} />
          Legal center
        </Badge>

        <h1 className="heading-lg mt-5 max-w-4xl text-balance">
          SkillDrop legal and trust information.
        </h1>

        <p className="mt-4 max-w-3xl text-lg leading-8 text-muted">
          Find the main SkillDrop policies for using the marketplace, booking
          calls, handling payments, protecting privacy and resolving disputes.
        </p>
      </section>

      <section className="mt-10 grid gap-5 md:grid-cols-2">
        {legalPages.map((page) => {
          const Icon = page.icon;

          return (
            <Link key={page.href} href={page.href} className="group">
              <Card className="p-6 transition group-hover:-translate-y-0.5 group-hover:shadow-[var(--shadow-md)]">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary-dark)]">
                  <Icon size={22} />
                </div>

                <h2 className="mt-5 text-2xl font-black tracking-[-0.04em]">
                  {page.title}
                </h2>

                <p className="mt-3 text-sm font-bold leading-7 text-muted">
                  {page.text}
                </p>

                <span className="mt-5 inline-flex items-center gap-2 text-sm font-black text-[var(--primary-dark)]">
                  Open page
                  <ArrowRight size={16} />
                </span>
              </Card>
            </Link>
          );
        })}
      </section>

      <section className="mt-10">
        <Card soft className="p-6 md:p-8">
          <p className="text-sm font-black text-[var(--foreground)]">
            MVP legal note
          </p>

          <p className="mt-2 text-sm font-bold leading-6 text-muted">
            These pages are practical MVP drafts. Before a full public launch,
            review them with a qualified legal professional and adapt them to
            your company, country, payment setup and marketplace rules.
          </p>
        </Card>
      </section>
    </main>
  );
}