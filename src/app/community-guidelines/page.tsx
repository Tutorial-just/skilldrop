import { HeartHandshake, MessageCircle, Scale, ShieldCheck } from "lucide-react";
import { PolicyCard, PolicyGrid, PolicyHero, PolicySection } from "@/components/marketplace/policy-card";

export default function CommunityGuidelinesPage() {
  return (
    <main>
      <PolicyHero eyebrow="Guidelines" title="Respectful, useful and honest help." text="SkillDrop works only if buyers and helpers keep calls practical, safe and respectful." />
      <PolicySection title="Marketplace behavior">
        <PolicyGrid>
          <PolicyCard icon={<MessageCircle size={20} />} title="Be clear" text="Buyers should explain the problem. Helpers should explain what they can and cannot solve." />
          <PolicyCard icon={<HeartHandshake size={20} />} title="Be respectful" text="No insults, threats, harassment, manipulation or discrimination." />
          <PolicyCard icon={<Scale size={20} />} title="Be honest" text="Helpers must not exaggerate credentials or promise impossible results. Buyers must not misuse refund/dispute tools." />
          <PolicyCard icon={<ShieldCheck size={20} />} title="Respect boundaries" text="SkillDrop calls are not a substitute for professional emergency, medical, legal or financial services." />
        </PolicyGrid>
      </PolicySection>
    </main>
  );
}
