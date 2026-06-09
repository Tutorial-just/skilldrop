import type { ReactNode } from "react";
import { ArrowRight, Clock3, Languages, Search, Sparkles, type LucideIcon } from "lucide-react";

import { createHelpRequestAction } from "@/server/actions/help-request.actions";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export const metadata = {
  title: "Start with a problem | SkillDrop",
  description: "Tell SkillDrop what you need, your language, urgency and budget so the marketplace can recommend better helpers.",
};

const suggestions = [
  "I need help improving my CV for an alternance application.",
  "I have an error on my website and I need someone to explain what to do.",
  "I received an official document and I need to understand the next step.",
];

export default function BuyerOnboardingPage() {
  return (
    <main className="container-page py-8 md:py-12">
      <div className="mx-auto max-w-5xl">
        <Badge variant="primary">
          <Sparkles size={14} />
          Buyer onboarding
        </Badge>
        <h1 className="heading-lg mt-5 max-w-3xl text-balance">Start with the problem, not with filters.</h1>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-[var(--muted-foreground)]">
          A short brief helps SkillDrop recommend better experts, services and call formats.
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px] lg:items-start">
          <Card className="p-5 md:p-6">
            <form action={createHelpRequestAction} className="grid gap-5">
                <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
              <div>
                <label htmlFor="q" className="text-sm font-black">What do you need help with?</label>
                <textarea id="q" name="q" required minLength={3} maxLength={260} rows={6} className="mt-2 w-full rounded-[24px] border border-[var(--border)] bg-[var(--background-soft)] p-4 text-sm font-medium leading-7 outline-none" placeholder="Situation — ... Goal — ... Already tried — ..." />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <Field icon={Languages} label="Language">
                  <input name="language" className="input mt-2" placeholder="French, English..." />
                </Field>
                <Field icon={Clock3} label="Urgency">
                  <select name="urgency" className="input mt-2" defaultValue="flexible">
                    <option value="today">Today</option>
                    <option value="this-week">This week</option>
                    <option value="flexible">Flexible</option>
                  </select>
                </Field>
                <Field icon={Sparkles} label="Max budget (€)">
                  <input name="maxPrice" type="number" min="1" step="1" className="input mt-2" placeholder="30" />
                </Field>
              </div>

              <div className="rounded-[24px] border border-[var(--border)] bg-[var(--card-soft)] p-4">
                <label htmlFor="attachmentLinks" className="text-sm font-black">Optional file links</label>
                <textarea id="attachmentLinks" name="attachmentLinks" rows={3} className="mt-2 w-full rounded-[20px] border border-[var(--border)] bg-[var(--background-soft)] p-3 text-sm font-medium leading-6 outline-none" placeholder="Paste CV, screenshot or PDF links if useful" />
              </div>

              <button className="btn btn-primary w-fit" type="submit">
                Get matched
                <ArrowRight size={18} />
              </button>
            </form>
          </Card>

          <div className="grid gap-4">
            <Card soft className="p-5">
              <Badge variant="accent">
                <Search size={14} />
                Good examples
              </Badge>
              <div className="mt-4 grid gap-3">
                {suggestions.map((suggestion) => (
                  <div key={suggestion} className="rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] p-3 text-sm font-bold leading-6 text-[var(--muted-foreground)]">{suggestion}</div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}

function Field({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="inline-flex items-center gap-2 text-sm font-black"><Icon size={14} /> {label}</span>
      {children}
    </label>
  );
}
