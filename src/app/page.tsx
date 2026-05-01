import Link from "next/link";

const problems = [
  {
    title: "Prepare for interviews",
    text: "Practice with someone experienced before the real conversation.",
  },
  {
    title: "Improve your CV or LinkedIn",
    text: "Get direct feedback before sending applications.",
  },
  {
    title: "Make better career decisions",
    text: "Talk to someone who has already solved a similar problem.",
  },
];

const steps = [
  {
    number: "01",
    title: "Tell us what you need",
    text: "Choose your goal: CV review, interview prep, LinkedIn, remote jobs or career advice.",
  },
  {
    number: "02",
    title: "Get matched with experts",
    text: "Compare experts by skills, service, price, language and availability.",
  },
  {
    number: "03",
    title: "Book a short session",
    text: "Pick a time, confirm your booking and join a video session.",
  },
];

export default function HomePage() {
  return (
    <main>
      <section className="container-page flex min-h-[calc(100vh-72px)] items-center py-14">
        <div className="grid w-full gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <div className="inline-flex rounded-full border border-[#e8e1d8] bg-white px-4 py-2 text-sm font-black text-[#2563eb] shadow-sm">
              Expert help, when you need clarity
            </div>

            <h1 className="mt-7 max-w-5xl text-balance text-5xl font-black tracking-tight md:text-7xl">
              Get practical advice from the right expert.
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-[#6f6a63]">
              SkillDrop helps people book short 1:1 video sessions with experts
              for interviews, CV reviews, LinkedIn feedback, remote jobs and
              career decisions.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/sign-in?next=/buyer"
                className="rounded-full bg-[#2563eb] px-7 py-4 text-center text-sm font-black text-white transition hover:bg-[#1d4ed8]"
              >
                I need expert help
              </Link>

              <Link
                href="/become-expert"
                className="rounded-full bg-[#151515] px-7 py-4 text-center text-sm font-black text-white transition hover:bg-black"
              >
                I want to become expert
              </Link>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <TrustItem text="Verified experts" />
              <TrustItem text="Short video sessions" />
              <TrustItem text="Transparent pricing" />
            </div>
          </div>

          <div className="card rounded-[2.75rem] p-4">
            <div className="rounded-[2.25rem] bg-[#151515] p-6 text-white">
              <p className="text-sm font-black text-[#f97316]">
                Example use case
              </p>

              <h2 className="mt-3 text-3xl font-black tracking-tight">
                “I have an interview this week and need honest feedback.”
              </h2>

              <p className="mt-4 leading-8 text-white/60">
                Instead of searching online for hours, book a short session with
                someone who can review your situation and give direct next steps.
              </p>

              <div className="mt-6 space-y-3">
                <PreviewCard title="CV review" value="15 min" />
                <PreviewCard title="Mock interview" value="30 min" />
                <PreviewCard title="LinkedIn audit" value="15 min" />
              </div>

              <Link
                href="/sign-in?next=/buyer"
                className="mt-6 block rounded-full bg-white px-6 py-3 text-center text-sm font-black text-[#151515] transition hover:bg-[#f7f4ef]"
              >
                Get started
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section id="why" className="container-page pb-20">
        <div className="mb-8 max-w-3xl">
          <p className="text-sm font-black text-[#2563eb]">Why SkillDrop</p>

          <h2 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
            Built for focused career moments.
          </h2>

          <p className="mt-4 leading-8 text-[#6f6a63]">
            Sometimes you do not need a course, a coach package or weeks of
            research. You need one clear conversation with the right person.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {problems.map((item) => (
            <div key={item.title} className="card rounded-[2rem] p-7">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eef4ff] text-xl">
                ✓
              </div>

              <h3 className="mt-6 text-xl font-black">{item.title}</h3>

              <p className="mt-3 leading-7 text-[#6f6a63]">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="container-page pb-20">
        <div className="rounded-[2.75rem] bg-[#151515] p-8 text-white md:p-10">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="text-sm font-black text-[#f97316]">
                How it works
              </p>

              <h2 className="mt-3 text-4xl font-black tracking-tight">
                Simple path from problem to session.
              </h2>

              <p className="mt-4 leading-8 text-white/60">
                Register, choose your goal, find an expert and book a short
                video session.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {steps.map((step) => (
                <div key={step.number} className="rounded-[2rem] bg-white/8 p-6">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-sm font-black text-[#151515]">
                    {step.number}
                  </div>

                  <h3 className="mt-5 text-lg font-black">{step.title}</h3>

                  <p className="mt-3 text-sm leading-7 text-white/55">
                    {step.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="for-experts" className="container-page pb-24">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-[2.75rem] bg-[#eef4ff] p-8 md:p-10">
            <p className="text-sm font-black text-[#2563eb]">For clients</p>

            <h2 className="mt-3 text-4xl font-black tracking-tight">
              Get help before important decisions.
            </h2>

            <p className="mt-4 leading-8 text-[#6f6a63]">
              Use SkillDrop when you need direct feedback from someone with
              experience.
            </p>

            <Link
              href="/sign-in?next=/buyer"
              className="mt-7 inline-flex rounded-full bg-[#151515] px-6 py-3 text-sm font-black text-white transition hover:bg-[#2563eb]"
            >
              Create client account
            </Link>
          </div>

          <div className="rounded-[2.75rem] bg-[#151515] p-8 text-white md:p-10">
            <p className="text-sm font-black text-[#f97316]">For experts</p>

            <h2 className="mt-3 text-4xl font-black tracking-tight">
              Turn your experience into paid sessions.
            </h2>

            <p className="mt-4 leading-8 text-white/60">
              Create services, add availability and help people through short
              practical calls.
            </p>

            <Link
              href="/become-expert"
              className="mt-7 inline-flex rounded-full bg-white px-6 py-3 text-sm font-black text-[#151515] transition hover:bg-[#f7f4ef]"
            >
              Apply as expert
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function TrustItem({ text }: { text: string }) {
  return (
    <div className="rounded-[1.5rem] border border-[#e8e1d8] bg-white p-4">
      <p className="text-sm font-black text-[#151515]">✓ {text}</p>
    </div>
  );
}

function PreviewCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-[1.5rem] bg-white/8 p-4">
      <p className="font-black">{title}</p>
      <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-[#151515]">
        {value}
      </span>
    </div>
  );
}