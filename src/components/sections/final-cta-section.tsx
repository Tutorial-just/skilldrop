import { ArrowRight, Search, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function FinalCtaSection() {
  return (
    <section className="section-page-sm">
      <div className="container-page">
        <Card className="relative overflow-hidden p-8 md:p-10 lg:p-12">
          <div className="absolute right-[-80px] top-[-80px] h-[240px] w-[240px] rounded-full bg-[var(--primary)]/10 blur-3xl" />
          <div className="absolute bottom-[-90px] left-[-90px] h-[260px] w-[260px] rounded-full bg-[var(--accent)]/10 blur-3xl" />

          <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <Badge variant="accent">
                <Sparkles size={14} />
                Start with one short call
              </Badge>

              <h2 className="heading-lg mt-5 max-w-3xl text-balance">
                Need help or want to offer help?
              </h2>

              <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--muted-foreground)]">
                Create your account and choose the workspace that fits you.
                SkillDrop is built around problems, people, calls and outcomes.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <ButtonLink href="/experts">
                I need help
                <Search size={18} />
              </ButtonLink>

              <ButtonLink href="/sign-up?role=expert" variant="secondary">
                I want to offer help
                <ArrowRight size={18} />
              </ButtonLink>
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
}
