import Link from "next/link";
import {
  BadgeCheck,
  Globe2,
  HeartHandshake,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";

const productLinks = [
  {
    label: "Marketplace",
    href: "/experts",
  },
  {
    label: "Create account",
    href: "/sign-up",
  },
  {
    label: "Become a helper",
    href: "/sign-up?role=expert",
  },
  {
    label: "How it works",
    href: "/#how-it-works",
  },
];

const marketplaceLinks = [
  {
    label: "Career help",
    href: "/experts?q=career",
  },
  {
    label: "Documents",
    href: "/experts?q=documents",
  },
  {
    label: "Translation",
    href: "/experts?q=translation",
  },
  {
    label: "Moving abroad",
    href: "/experts?q=moving%20abroad",
  },
];

const trustLinks = [
  {
    label: "Safety",
    href: "/legal/safety",
  },
  {
    label: "Refund policy",
    href: "/legal/refunds",
  },
  {
    label: "Terms",
    href: "/legal/terms",
  },
  {
    label: "Privacy",
    href: "/legal/privacy",
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-[var(--border)] bg-white/45 theme-dark:bg-white/[0.03]">
      <div className="container-page py-10 md:py-12">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr]">
          <div>
            <Link href="/" className="inline-flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] text-white shadow-[var(--shadow-sm)]">
                <Sparkles size={21} />
              </div>

              <div>
                <p className="text-lg font-black tracking-[-0.03em]">
                  SkillDrop
                </p>

                <p className="text-xs font-bold text-muted">
                  Practical help in short 1:1 calls
                </p>
              </div>
            </Link>

            <p className="mt-5 max-w-sm text-sm font-semibold leading-6 text-muted">
              Book short 1:1 calls with real people who can help with
              documents, career, languages, tech, relocation, studies and
              everyday decisions.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <Badge variant="success">
                <ShieldCheck size={14} />
                Trust-first
              </Badge>

              <Badge variant="primary">
                <Globe2 size={14} />
                Global
              </Badge>

              <Badge variant="accent">
                <HeartHandshake size={14} />
                Human help
              </Badge>
            </div>
          </div>

          <FooterColumn title="Product" links={productLinks} />
          <FooterColumn title="Marketplace" links={marketplaceLinks} />
          <FooterColumn title="Trust & legal" links={trustLinks} />
        </div>

        <div className="mt-10 flex flex-col justify-between gap-4 border-t border-[var(--border)] pt-6 md:flex-row md:items-center">
          <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-muted">
            <span>© {new Date().getFullYear()} SkillDrop.</span>
            <span>Built for practical human help.</span>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-muted">
            <span className="inline-flex items-center gap-1">
              <BadgeCheck size={14} />
              Trust & safety foundation
            </span>

            <Link
              href="/legal/safety"
              className="hover-scale text-[var(--primary-dark)]"
            >
              Safety
            </Link>

            <Link
              href="/legal/refunds"
              className="hover-scale text-[var(--primary-dark)]"
            >
              Refunds
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: {
    label: string;
    href: string;
  }[];
}) {
  return (
    <div>
      <h2 className="text-sm font-black uppercase tracking-[0.16em] text-[var(--foreground)]">
        {title}
      </h2>

      <div className="mt-4 grid gap-3">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="interactive inline-flex w-fit text-sm font-bold text-muted hover:text-[var(--primary-dark)]"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}