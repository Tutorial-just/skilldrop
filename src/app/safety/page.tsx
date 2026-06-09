import { Ban, Lock, ShieldAlert, ShieldCheck } from "lucide-react";
import { PolicyCard, PolicyGrid, PolicyHero, PolicySection } from "@/components/marketplace/policy-card";

export default function SafetyPage() {
  return (
    <main>
      <PolicyHero eyebrow="Safety" title="A safer marketplace for practical help." text="SkillDrop adds structure around calls: verified helpers, protected rooms, reports, clear boundaries and admin review." />
      <PolicySection title="Core safety rules">
        <PolicyGrid>
          <PolicyCard icon={<Lock size={20} />} title="No sensitive secrets" text="Do not share passwords, bank codes, private account access, identity documents or sensitive medical/legal details inside calls." />
          <PolicyCard icon={<ShieldCheck size={20} />} title="Stay on platform" text="Use SkillDrop booking, payment and reporting tools. They create the record needed to resolve problems." />
          <PolicyCard icon={<Ban size={20} />} title="No abuse" text="Harassment, intimidation, scams, hate or manipulation can lead to suspension." />
          <PolicyCard icon={<ShieldAlert size={20} />} title="Report problems" text="If a helper or buyer does not join, behaves badly or provides the wrong service, report the booking for admin review." />
        </PolicyGrid>
      </PolicySection>
    </main>
  );
}
