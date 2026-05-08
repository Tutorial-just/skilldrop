import Link from "next/link";
import {
  ArrowLeft,
  Home,
  Search,
  ShieldAlert,
  Sparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function NotFoundPage() {
  return (
    <main className="relative min-h-[calc(100vh-76px)] overflow-hidden">
      <div className="surface-grid absolute inset-0 opacity-50" />
      <div className="absolute left-[-120px] top-[-140px] h-[360px] w-[360px] rounded-full bg-[var(--primary)]/14 blur-3xl" />
      <div className="absolute bottom-[-160px] right-[-120px] h-[420px] w-[420px] rounded-full bg-[var(--accent)]/13 blur-3xl" />

      <section className="container-page relative flex min-h-[calc(100vh-76px)] items-center py-12">
        <Card className="mx-auto max-w-3xl p-6 text-center md:p-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[28px] bg-gradient-to-br from-[var(--primary)] to-[#8b5cf6] text-white shadow-[var(--shadow-sm)]">
            <Sparkles size={28} />
          </div>

          <Badge variant="accent" className="mt-6">
            <ShieldAlert size={14} />
            Page not found
          </Badge>

          <h1 className="heading-lg mt-5 text-balance">
            This page does not exist.
          </h1>

          <p className="mx-auto mt-4 max-w-xl text-lg leading-8 text-muted">
            The link may be broken, the page may have moved, or you may not have
            access to this area.
          </p>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <ButtonLink href="/">
              <Home size={18} />
              Back home
            </ButtonLink>

            <ButtonLink href="/experts" variant="secondary">
              <Search size={18} />
              Browse experts
            </ButtonLink>
          </div>

          <div className="mt-8 rounded-[24px] border border-[var(--border)] bg-white/64 p-4 text-left">
            <div className="flex gap-3">
              <ArrowLeft
                size={18}
                className="mt-0.5 shrink-0 text-[var(--primary-dark)]"
              />

              <div>
                <p className="font-black tracking-[-0.02em]">
                  Quick tip
                </p>

                <p className="mt-1 text-sm font-bold leading-6 text-muted">
                  If you were trying to open a booking, profile or dashboard,
                  go back to your dashboard and open it from there.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-3 text-sm font-bold text-muted">
            <Link href="/buyer" className="hover:text-[var(--foreground)]">
              Buyer dashboard
            </Link>

            <Link href="/expert" className="hover:text-[var(--foreground)]">
              Expert dashboard
            </Link>

            <Link href="/help" className="hover:text-[var(--foreground)]">
              Help
            </Link>
          </div>
        </Card>
      </section>
    </main>
  );
}