import { CreditCard, Euro, Receipt, ShieldCheck } from "lucide-react";
import { PolicyCard, PolicyGrid, PolicyHero, PolicySection } from "@/components/marketplace/policy-card";

export default function FeesPage() {
  return (
    <main>
      <PolicyHero
        eyebrow="Pricing & fees"
        title="Clear pricing before every call."
        text="Experts set their service prices. SkillDrop shows the total before checkout, including platform or service fees when they apply."
        primaryHref="/experts"
        primaryLabel="Find a helper"
      />
      <PolicySection title="How payment works">
        <PolicyGrid>
          <PolicyCard icon={<Euro size={20} />} title="Expert price" text="Each helper chooses the price for every offer based on duration, topic and experience." />
          <PolicyCard icon={<Receipt size={20} />} title="Total shown upfront" text="The checkout summary shows the service price, platform fee if configured, and the final total." />
          <PolicyCard icon={<CreditCard size={20} />} title="Secure checkout" text="Payment is handled through Stripe. SkillDrop does not ask buyers to send money outside the platform." />
          <PolicyCard icon={<ShieldCheck size={20} />} title="Dispute protection" text="If a call fails because something went wrong, buyers and helpers can report the booking for review." />
        </PolicyGrid>
      </PolicySection>
      <PolicySection title="Simple rule" text="Never pay a helper outside SkillDrop for a booked SkillDrop service. Keeping payment inside the platform protects both sides.">
        <div className="rounded-[28px] border border-[var(--warning)]/20 bg-[var(--warning-soft)] p-6 text-sm font-bold leading-7 text-[var(--warning)]">
          If an expert asks for external payment, screenshots or bank details, do not continue. Report the booking to SkillDrop.
        </div>
      </PolicySection>
    </main>
  );
}
