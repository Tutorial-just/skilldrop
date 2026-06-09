import { BadgeCheck, Rocket, ShieldCheck, Sparkles } from "lucide-react";
import { PolicyCard, PolicyGrid, PolicyHero, PolicySection } from "@/components/marketplace/policy-card";

export default function EarlyAccessPage() {
  return (
    <main>
      <PolicyHero eyebrow="Early access" title="SkillDrop is built carefully before scaling." text="During early access, helpers are reviewed manually, categories may have limited availability and the platform focuses on quality before volume." primaryHref="/for-experts" primaryLabel="Become a helper" />
      <PolicySection title="What early access means">
        <PolicyGrid>
          <PolicyCard icon={<Rocket size={20} />} title="Limited supply" text="Some categories may have few helpers while the marketplace is growing." />
          <PolicyCard icon={<BadgeCheck size={20} />} title="Manual review" text="SkillDrop can review experts, services and disputes before opening the platform wider." />
          <PolicyCard icon={<ShieldCheck size={20} />} title="Quality first" text="The goal is fewer but better calls with clear outcomes and reliable helpers." />
          <PolicyCard icon={<Sparkles size={20} />} title="Feedback matters" text="User feedback helps improve onboarding, categories, pricing and call quality." />
        </PolicyGrid>
      </PolicySection>
    </main>
  );
}
