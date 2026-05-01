import Link from "next/link";

const plans = [
  {
    name: "Buyer",
    badge: "For job seekers",
    price: "Free",
    description:
      "Browse experts, compare services and book short career sessions.",
    features: [
      "Browse verified experts",
      "Compare prices and services",
      "Send booking requests",
      "Track booking status",
    ],
    cta: "Find experts",
    href: "/experts",
    highlighted: false,
  },
  {
    name: "Expert",
    badge: "For mentors",
    price: "15%",
    suffix: "platform fee",
    description:
      "Sell focused 1:1 sessions without building your own website or funnel.",
    features: [
      "Create expert profile",
      "Add paid services",
      "Receive bookings",
      "Stripe checkout flow",
      "Dashboard tracking",
    ],
    cta: "Become an expert",
    href: "/become-expert",
    highlighted: true,
  },
  {
    name: "Teams",
    badge: "Coming soon",
    price: "Custom",
    description:
      "For companies that want curated career help for employees or candidates.",
    features: [
      "Team credits",
      "Curated expert pools",
      "Centralized billing",
      "Admin reporting",
    ],
    cta: "Explore marketplace",
    href: "/experts",
    highlighted: false,
  },
];

const faq = [
  {
    question: "Do buyers pay a subscription?",
    answer:
      "No. Buyers can browse experts for free and pay only for individual sessions.",
  },
  {
    question: "How does SkillDrop make money?",
    answer:
      "The core model is a platform fee on paid sessions. SkillDrop earns when experts earn, keeping incentives aligned.",
  },
  {
    question: "Can experts set their own prices?",
    answer:
      "Yes. Each expert can create services with their own duration and price.",
  },
];

export default function PricingPage() {
  return (
    <main>
      <section className="container-page py-16">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex rounded-full border border-[#e8e1d8] bg-white px-4 py-2 text-sm font-black text-[#2563eb] shadow-sm">
            Simple marketplace pricing
          </div>

          <h1 className="mt-7 text-balance text-5xl font-black tracking-tight md:text-6xl">
            Free to browse. Pay when value is delivered.
          </h1>

          <p className="mt-5 text-lg leading-8 text-[#6f6a63]">
            SkillDrop is built around short expert sessions. Buyers pay per
            session. Experts pay a platform fee when they earn.
          </p>
        </div>

        <div className="mt-14 grid gap-5 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-[2.4rem] border p-7 shadow-xl shadow-black/5 ${
                plan.highlighted
                  ? "border-[#151515] bg-[#151515] text-white"
                  : "border-[#e8e1d8] bg-white"
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                <p
                  className={`text-sm font-black ${
                    plan.highlighted ? "text-[#f97316]" : "text-[#2563eb]"
                  }`}
                >
                  {plan.name}
                </p>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-black ${
                    plan.highlighted
                      ? "bg-white/10 text-white/70"
                      : "bg-[#f7f4ef] text-[#6f6a63]"
                  }`}
                >
                  {plan.badge}
                </span>
              </div>

              <div className="mt-8">
                <span className="text-5xl font-black">{plan.price}</span>
                {plan.suffix ? (
                  <span
                    className={`ml-2 text-sm font-bold ${
                      plan.highlighted ? "text-white/45" : "text-[#6f6a63]"
                    }`}
                  >
                    {plan.suffix}
                  </span>
                ) : null}
              </div>

              <p
                className={`mt-5 min-h-[84px] leading-7 ${
                  plan.highlighted ? "text-white/55" : "text-[#6f6a63]"
                }`}
              >
                {plan.description}
              </p>

              <div className="mt-7 space-y-3">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex gap-3">
                    <span
                      className={
                        plan.highlighted ? "text-[#f97316]" : "text-[#2563eb]"
                      }
                    >
                      ✓
                    </span>
                    <span
                      className={`text-sm ${
                        plan.highlighted ? "text-white/70" : "text-[#6f6a63]"
                      }`}
                    >
                      {feature}
                    </span>
                  </div>
                ))}
              </div>

              <Link
                href={plan.href}
                className={`mt-8 block rounded-full px-5 py-3 text-center text-sm font-black transition ${
                  plan.highlighted
                    ? "bg-white text-[#151515] hover:bg-[#f7f4ef]"
                    : "bg-[#151515] text-white hover:bg-[#2563eb]"
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="container-page pb-20">
        <div className="rounded-[2.5rem] bg-[#151515] p-8 text-white md:p-10">
          <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr]">
            <div>
              <p className="text-sm font-black text-[#f97316]">
                Marketplace economics
              </p>

              <h2 className="mt-4 text-4xl font-black tracking-tight">
                The business model is simple.
              </h2>

              <p className="mt-4 leading-8 text-white/60">
                SkillDrop grows when experts earn and buyers get useful help.
                That keeps incentives aligned.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <Metric label="Buyer pays" value="€20" />
              <Metric label="Platform fee" value="15%" />
              <Metric label="Expert earns" value="€17" />
            </div>
          </div>
        </div>
      </section>

      <section className="container-page pb-24">
        <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-sm font-black text-[#2563eb]">FAQ</p>
            <h2 className="mt-3 text-4xl font-black tracking-tight">
              Clear answers before launch.
            </h2>
          </div>

          <div className="space-y-4">
            {faq.map((item) => (
              <div key={item.question} className="card rounded-[2rem] p-6">
                <h3 className="font-black">{item.question}</h3>
                <p className="mt-3 leading-7 text-[#6f6a63]">{item.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.75rem] bg-white/10 p-6">
      <p className="text-sm text-white/45">{label}</p>
      <p className="mt-3 text-4xl font-black text-white">{value}</p>
    </div>
  );
}