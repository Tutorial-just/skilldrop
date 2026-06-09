import { ArrowRight, FileText, Search, ShieldCheck, Video } from "lucide-react";
import { PolicyCard, PolicyGrid, PolicyHero, PolicySection } from "@/components/marketplace/policy-card";

export default function HowItWorksPage() {
  return (
    <main>
      <PolicyHero
        eyebrow="How SkillDrop works"
        title="From a problem to a clear action plan."
        text="SkillDrop is designed around one simple promise: describe what you need, book the right helper, then leave the call with practical next steps."
        primaryHref="/help-me"
        primaryLabel="Describe a problem"
      />

      <PolicySection title="For buyers" text="The buyer experience is focused on reducing hesitation and avoiding empty searches.">
        <PolicyGrid>
          <PolicyCard icon={<FileText size={20} />} title="1. Describe the problem" text="Explain the situation, your goal, urgency, budget and any useful context before choosing a helper." />
          <PolicyCard icon={<Search size={20} />} title="2. Get matched" text="SkillDrop highlights relevant helpers, matching offers, languages, availability and clear reasons why they fit." />
          <PolicyCard icon={<Video size={20} />} title="3. Book a short call" text="Pick a service, choose an available slot, pay securely and join the protected call room when it opens." />
          <PolicyCard icon={<ShieldCheck size={20} />} title="4. Leave with next steps" text="After the call, the helper can write an outcome so you keep a useful action plan instead of vague memories." />
        </PolicyGrid>
      </PolicySection>

      <PolicySection title="For helpers" text="Helpers get a structured workspace instead of random requests.">
        <div className="grid gap-4 lg:grid-cols-4">
          {[
            ["Create a strong profile", "Add headline, bio, skills, languages, trust signals and documents."],
            ["Publish clear offers", "Each service explains the result, duration, category and price."],
            ["Open availability", "Buyers book inside your windows, so your calendar stays controlled."],
            ["Write outcomes", "After-call action plans improve trust, reviews and repeat bookings."],
          ].map(([title, text], index) => (
            <article key={title} className="rounded-[28px] border border-[var(--border)] bg-[var(--card)] p-6 shadow-[var(--shadow-sm)]">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-sm font-black text-[var(--primary-dark)]">0{index + 1}</span>
              <h3 className="mt-5 text-lg font-black tracking-[-0.04em]">{title}</h3>
              <p className="mt-3 text-sm font-medium leading-7 text-[var(--muted-foreground)]">{text}</p>
            </article>
          ))}
        </div>
      </PolicySection>

      <section className="container-page pb-16">
        <div className="rounded-[34px] border border-[var(--border)] bg-[var(--foreground)] p-7 text-white shadow-[var(--shadow-md)] md:p-9">
          <p className="text-sm font-black uppercase tracking-[0.14em] text-white/60">Main principle</p>
          <h2 className="mt-4 max-w-3xl text-3xl font-black tracking-[-0.05em] md:text-5xl">SkillDrop is not a directory. It is a problem-solving flow.</h2>
          <a href="/experts" className="btn mt-7 inline-flex rounded-full border border-white/20 bg-white px-5 py-3 text-sm font-black text-[var(--foreground)] hover:bg-white/90">
            Browse helpers <ArrowRight size={18} />
          </a>
        </div>
      </section>
    </main>
  );
}
