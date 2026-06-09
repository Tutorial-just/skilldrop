import { AlertTriangle, CheckCircle2, Clock3, RefreshCcw } from "lucide-react";
import { PolicyCard, PolicyGrid, PolicyHero, PolicySection } from "@/components/marketplace/policy-card";

export default function RefundPolicyPage() {
  return (
    <main>
      <PolicyHero eyebrow="Refund policy" title="Clear rules for cancellations, no-shows and disputes." text="This page explains the product rules used by SkillDrop UI. Final decisions may depend on payment provider constraints and admin review." />
      <PolicySection title="Main cases">
        <PolicyGrid>
          <PolicyCard icon={<Clock3 size={20} />} title="Before payment" text="A pending booking can expire or be cancelled without payment. No refund is needed because no charge is completed." />
          <PolicyCard icon={<RefreshCcw size={20} />} title="After payment" text="Refund eligibility depends on timing, call status and whether the helper delivered the booked session." />
          <PolicyCard icon={<AlertTriangle size={20} />} title="No-show" text="If the expert does not join, the buyer can report expert no-show. If the buyer does not join, the expert can report buyer no-show." />
          <PolicyCard icon={<CheckCircle2 size={20} />} title="Admin review" text="Disputes are reviewed using booking records, reports, timestamps, call status and messages provided by both sides." />
        </PolicyGrid>
      </PolicySection>
      <PolicySection title="What buyers should do" text="Join on time, keep proof if something goes wrong, and report the issue from the booking page as soon as possible.">
        <div className="rounded-[28px] border border-[var(--border)] bg-[var(--card)] p-6 shadow-[var(--shadow-sm)]">
          <ol className="grid gap-3 text-sm font-bold leading-7 text-[var(--muted-foreground)] md:grid-cols-3">
            <li>1. Open the call room during the join window.</li>
            <li>2. Wait a reasonable moment for the other person.</li>
            <li>3. Use “Report problem” on the booking page.</li>
          </ol>
        </div>
      </PolicySection>
    </main>
  );
}
