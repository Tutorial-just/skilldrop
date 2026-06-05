import { HelpCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

const faqs = [
  {
    question: "What is SkillDrop?",
    answer:
      "SkillDrop is a marketplace for short 1:1 calls. A buyer describes a problem, chooses a helper, books a time and talks to a real person.",
  },
  {
    question: "Can SkillDrop really be for almost any problem?",
    answer:
      "Yes, the idea is broad, but the structure is controlled. Official categories keep the marketplace clean, and missing topics can be requested instead of being created chaotically.",
  },
  {
    question: "What happens if I cannot find the right category?",
    answer:
      "You can leave a help request. Admin can review demand, approve a new category, merge it with an existing one or reject unsafe topics.",
  },
  {
    question: "What do buyers receive after a call?",
    answer:
      "Besides the call itself, a helper can create an action plan after a completed booking with a summary and next steps.",
  },
  {
    question: "Is SkillDrop a replacement for professional advice?",
    answer:
      "No. SkillDrop is for guidance, explanation, teaching and practical help. It should not be used for illegal help, dangerous instructions or guaranteed medical, legal or financial outcomes.",
  },
  {
    question: "How does payment work?",
    answer:
      "The buyer sees the helper price, SkillDrop fee and total before checkout. Payment is handled through Stripe, and booking status is tracked in the dashboard.",
  },
];

export function FaqSection() {
  return (
    <section className="section-page bg-[var(--background-soft)]">
      <div className="container-page">
        <div className="mx-auto max-w-3xl text-center">
          <Badge variant="accent">
            <HelpCircle size={14} />
            FAQ
          </Badge>

          <h2 className="heading-xl mt-5 text-balance">
            Questions before your first call.
          </h2>

          <p className="mt-5 text-lg leading-8 text-[var(--muted-foreground)]">
            SkillDrop is simple for users, but serious about trust, safety and
            clear outcomes.
          </p>
        </div>

        <div className="mx-auto mt-10 grid max-w-4xl gap-4">
          {faqs.map((faq) => (
            <Card key={faq.question} className="p-5 md:p-6">
              <h3 className="text-xl font-black tracking-[-0.03em] text-[var(--foreground)]">
                {faq.question}
              </h3>

              <p className="mt-3 text-sm font-medium leading-7 text-[var(--muted-foreground)] md:text-base">
                {faq.answer}
              </p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
