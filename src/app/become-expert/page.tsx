import Link from "next/link";
import { applyExpertAction } from "@/server/actions/expert.actions";

const benefits = [
  {
    title: "Sell focused sessions",
    text: "Offer 15–30 minute calls instead of long freelance projects or unpaid advice.",
  },
  {
    title: "Use what you already know",
    text: "Help people with CV reviews, interviews, LinkedIn, career switches and remote jobs.",
  },
  {
    title: "No website needed",
    text: "SkillDrop gives you a profile, services, booking flow and payment experience.",
  },
];

const steps = [
  {
    number: "01",
    title: "Create your profile",
    text: "Add your headline, bio, skills, languages and expertise.",
  },
  {
    number: "02",
    title: "Add short services",
    text: "Create offers like CV Review, Mock Interview or LinkedIn Audit.",
  },
  {
    number: "03",
    title: "Receive bookings",
    text: "People choose a service, pick a time and submit a booking request.",
  },
  {
    number: "04",
    title: "Get paid for sessions",
    text: "After paid bookings, your earnings are tracked in your expert dashboard.",
  },
];

const services = [
  { title: "CV Review", time: "15 min", price: "€15" },
  { title: "Mock Interview", time: "30 min", price: "€30" },
  { title: "LinkedIn Audit", time: "15 min", price: "€12" },
];

const expertTypes = [
  "Recruiters",
  "Software engineers",
  "Career coaches",
  "Designers",
  "Founders",
  "Remote workers",
];

type BecomeExpertPageProps = {
  searchParams?: Promise<{
    submitted?: string;
  }>;
};

export default async function BecomeExpertPage({
  searchParams,
}: BecomeExpertPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const submitted = resolvedSearchParams.submitted === "1";

  return (
    <main>
      <section className="container-page grid min-h-[calc(100vh-72px)] items-center gap-12 py-16 lg:grid-cols-[1fr_0.92fr]">
        <div>
          <div className="inline-flex rounded-full border border-[#e8e1d8] bg-white px-4 py-2 text-sm font-black text-[#f97316] shadow-sm">
            For experts
          </div>

          <h1 className="mt-7 max-w-4xl text-balance text-5xl font-black tracking-tight md:text-7xl">
            Turn your career experience into paid 1:1 sessions.
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-[#6f6a63]">
            SkillDrop helps experienced people sell short, practical calls to
            job seekers who need fast feedback before important career moments.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/sign-in?next=/expert"
              className="rounded-full bg-[#151515] px-7 py-4 text-center text-sm font-black text-white transition hover:bg-[#2563eb]"
            >
              Open expert workspace
            </Link>

            <Link
              href="/pricing"
              className="rounded-full border border-[#e8e1d8] bg-white px-7 py-4 text-center text-sm font-black text-[#151515] transition hover:bg-[#f7f4ef]"
            >
              See pricing
            </Link>
          </div>

          <div className="mt-9 flex flex-wrap gap-2">
            {expertTypes.map((type) => (
              <span
                key={type}
                className="rounded-full border border-[#e8e1d8] bg-white/80 px-4 py-2 text-sm font-bold text-[#6f6a63]"
              >
                {type}
              </span>
            ))}
          </div>
        </div>

        <div className="card rounded-[2.5rem] p-4">
          <div className="rounded-[2rem] bg-[#151515] p-6 text-white">
            <div className="flex items-center justify-between border-b border-white/10 pb-5">
              <div>
                <p className="text-sm font-bold text-white/45">
                  Expert profile preview
                </p>
                <p className="mt-1 text-lg font-black">Live on SkillDrop</p>
              </div>

              <span className="rounded-full bg-[#f97316] px-4 py-2 text-xs font-black text-white">
                Verified
              </span>
            </div>

            <div className="mt-6 flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#f97316] text-2xl font-black">
                E
              </div>

              <div>
                <h2 className="text-2xl font-black">Your Name</h2>
                <p className="mt-1 text-sm text-white/50">
                  Senior expert helping people move faster
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <MiniStat label="Rating" value="⭐ 4.9" />
              <MiniStat label="Sessions" value="120" />
              <MiniStat label="From" value="€15" />
            </div>

            <div className="mt-6 space-y-3">
              {services.map((service) => (
                <div key={service.title} className="rounded-2xl bg-white/8 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-black">{service.title}</p>
                      <p className="mt-1 text-sm text-white/45">
                        {service.time} focused call
                      </p>
                    </div>

                    <p className="font-black text-[#f97316]">
                      {service.price}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-2xl bg-white p-4 text-[#151515]">
              <p className="text-sm font-black text-[#2563eb]">
                Example booking
              </p>
              <p className="mt-2 text-sm leading-6 text-[#6f6a63]">
                “I have an interview tomorrow and need practical feedback.”
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="container-page pb-20">
        <div className="mb-8">
          <p className="text-sm font-black text-[#2563eb]">Why experts join</p>
          <h2 className="mt-3 max-w-2xl text-4xl font-black tracking-tight">
            A simple way to monetize what you already know.
          </h2>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {benefits.map((benefit) => (
            <div key={benefit.title} className="card rounded-[2rem] p-7">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eef4ff] text-xl">
                ✓
              </div>

              <h3 className="mt-6 text-xl font-black">{benefit.title}</h3>

              <p className="mt-3 leading-7 text-[#6f6a63]">{benefit.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container-page pb-20">
        <div className="card rounded-[2.5rem] p-8 md:p-10">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="text-sm font-black text-[#f97316]">
                How it works
              </p>

              <h2 className="mt-3 text-4xl font-black tracking-tight">
                Start with one service. Grow from there.
              </h2>

              <p className="mt-4 leading-8 text-[#6f6a63]">
                You do not need to launch a course, build a website or manage a
                complicated funnel. Start with one clear offer.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {steps.map((step) => (
                <div
                  key={step.number}
                  className="rounded-[1.75rem] bg-[#f7f4ef] p-6"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#151515] text-sm font-black text-white">
                    {step.number}
                  </div>

                  <h3 className="mt-5 font-black">{step.title}</h3>

                  <p className="mt-2 text-sm leading-6 text-[#6f6a63]">
                    {step.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="container-page pb-24">
        <div className="rounded-[2.5rem] bg-[#2563eb] p-8 text-center text-white md:p-12">
          <p className="text-sm font-black text-white/70">
            Become an early expert
          </p>

          <h2 className="mx-auto mt-4 max-w-3xl text-4xl font-black tracking-tight md:text-5xl">
            Help people make better career decisions.
          </h2>

          <p className="mx-auto mt-5 max-w-2xl leading-8 text-white/70">
            The first version of SkillDrop focuses on career help. Experts who
            join early get better visibility when the marketplace grows.
          </p>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/sign-in?next=/expert"
              className="rounded-full bg-white px-7 py-4 text-sm font-black text-[#151515] transition hover:bg-[#f7f4ef]"
            >
              Open expert workspace
            </Link>

            <Link
              href="/pricing"
              className="rounded-full bg-[#151515] px-7 py-4 text-sm font-black text-white transition hover:bg-black"
            >
              See business model
            </Link>
          </div>
        </div>
      </section>

      <section className="container-page pb-24">
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-sm font-black text-[#2563eb]">
              Apply as expert
            </p>

            <h2 className="mt-3 text-4xl font-black tracking-tight">
              Create your first expert offer.
            </h2>

            <p className="mt-4 leading-8 text-[#6f6a63]">
              Submit your profile and one service. Every expert profile is
              reviewed before appearing publicly in the marketplace.
            </p>

            <div className="mt-6 rounded-[1.75rem] bg-[#eef4ff] p-5">
              <p className="font-black text-[#2563eb]">Profile review</p>
              <p className="mt-2 text-sm leading-6 text-[#6f6a63]">
                Every expert profile is reviewed before appearing publicly in
                the marketplace.
              </p>
            </div>

            {submitted ? (
              <div className="mt-6 rounded-[1.75rem] bg-green-100 p-5">
                <p className="font-black text-green-700">
                  Application submitted
                </p>
                <p className="mt-2 text-sm leading-6 text-green-800">
                  Your expert profile was submitted successfully. It will appear
                  publicly after approval.
                </p>
              </div>
            ) : null}
          </div>

          <form
            action={applyExpertAction}
            className="card rounded-[2.4rem] p-6 md:p-8"
          >
            <div className="grid gap-5 md:grid-cols-2">
              <ExpertField label="Full name">
                <input
                  required
                  name="name"
                  placeholder="Alex Johnson"
                  className="input-field"
                />
              </ExpertField>

              <ExpertField label="Email">
                <input
                  required
                  type="email"
                  name="email"
                  placeholder="alex@email.com"
                  className="input-field"
                />
              </ExpertField>
            </div>

            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <ExpertField label="Country">
                <input
                  name="country"
                  placeholder="Germany"
                  className="input-field"
                />
              </ExpertField>

              <ExpertField label="Timezone">
                <input
                  required
                  name="timezone"
                  placeholder="Europe/Berlin"
                  className="input-field"
                />
              </ExpertField>
            </div>

            <div className="mt-5">
              <ExpertField label="Headline">
                <input
                  required
                  name="headline"
                  placeholder="Senior recruiter helping developers get hired"
                  className="input-field"
                />
              </ExpertField>
            </div>

            <div className="mt-5">
              <ExpertField label="Bio">
                <textarea
                  required
                  name="bio"
                  rows={5}
                  placeholder="Explain who you help and what kind of feedback you provide."
                  className="input-field resize-none"
                />
              </ExpertField>
            </div>

            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <ExpertField label="Languages">
                <input
                  required
                  name="languages"
                  placeholder="English, French"
                  className="input-field"
                />
              </ExpertField>

              <ExpertField label="Skills">
                <input
                  required
                  name="skills"
                  placeholder="CV Review, Interview Prep, LinkedIn"
                  className="input-field"
                />
              </ExpertField>
            </div>

            <div className="mt-5">
              <ExpertField label="Search tags / hashtags">
                <input
                  name="tags"
                  placeholder="react, frontend, cv-review, remote-jobs, linkedin, germany"
                  className="input-field"
                />
              </ExpertField>

              <p className="mt-2 text-sm leading-6 text-[#6f6a63]">
                Add keywords buyers may search for. Example: react, frontend,
                mock-interview, cv-review, remote-jobs, junior-developer.
              </p>
            </div>

            <div className="mt-8 rounded-[1.75rem] bg-[#f7f4ef] p-5">
              <p className="font-black">First service</p>
              <p className="mt-1 text-sm text-[#6f6a63]">
                Create one offer people can book.
              </p>

              <div className="mt-5">
                <ExpertField label="Service title">
                  <input
                    required
                    name="serviceTitle"
                    placeholder="CV Review for Software Engineers"
                    className="input-field"
                  />
                </ExpertField>
              </div>

              <div className="mt-5">
                <ExpertField label="Service description">
                  <textarea
                    required
                    name="serviceDescription"
                    rows={4}
                    placeholder="Describe what happens during the session."
                    className="input-field resize-none"
                  />
                </ExpertField>
              </div>

              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <ExpertField label="Duration">
                  <select
                    required
                    name="durationMinutes"
                    defaultValue="15"
                    className="input-field"
                  >
                    <option value="15">15 minutes</option>
                    <option value="30">30 minutes</option>
                    <option value="60">60 minutes</option>
                  </select>
                </ExpertField>

                <ExpertField label="Price in EUR">
                  <input
                    required
                    type="number"
                    min="5"
                    name="priceEuros"
                    defaultValue="15"
                    className="input-field"
                  />
                </ExpertField>
              </div>
            </div>

            <button
              type="submit"
              className="mt-8 w-full rounded-2xl bg-[#2563eb] px-7 py-4 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-[#1d4ed8]"
            >
              Submit expert application
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/8 p-4">
      <p className="text-xs font-bold text-white/45">{label}</p>
      <p className="mt-1 font-black">{value}</p>
    </div>
  );
}

function ExpertField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-black text-[#151515]">{label}</span>
      <div className="mt-2">{children}</div>
    </label>
  );
}