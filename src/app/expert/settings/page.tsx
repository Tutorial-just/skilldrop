import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function ExpertSettingsPage() {
  const expert = await prisma.expertProfile.findFirst({
    include: {
      user: true,
      services: true,
      availability: true,
      reviews: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <main className="container-page py-10">
      <section className="rounded-[2rem] bg-[#151515] p-6 text-white sm:rounded-[2.5rem] md:p-10">
        <div className="grid gap-8 lg:grid-cols-[1fr_360px] lg:items-end">
          <div>
            <p className="text-sm font-black text-[#f97316]">Expert settings</p>

            <h1 className="mt-4 text-4xl font-black tracking-tight md:text-5xl">
              Control your expert workspace.
            </h1>

            <p className="mt-4 max-w-2xl text-lg leading-8 text-white/60">
              Manage profile visibility, session preferences, notification logic
              and the parts of your public expert presence.
            </p>
          </div>

          <div className="rounded-[2rem] bg-white p-5 text-[#151515]">
            <p className="text-sm font-black text-[#2563eb]">
              Profile snapshot
            </p>

            <h2 className="mt-3 text-2xl font-black">
              {expert?.user.name ?? "Expert profile"}
            </h2>

            <p className="mt-2 text-sm leading-6 text-[#6f6a63]">
              {expert?.headline ?? "No headline yet"}
            </p>

            <div className="mt-5 space-y-3 rounded-[1.5rem] bg-[#f7f4ef] p-4">
              <SummaryRow
                label="Status"
                value={expert?.status ?? "Not created"}
              />
              <SummaryRow
                label="Services"
                value={`${expert?.services.length ?? 0}`}
              />
              <SummaryRow
                label="Availability"
                value={`${expert?.availability.length ?? 0}`}
              />
              <SummaryRow
                label="Reviews"
                value={`${expert?.reviews.length ?? 0}`}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="space-y-8">
          <div className="card rounded-[2rem] p-6">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <p className="text-sm font-black text-[#2563eb]">
                  Public profile
                </p>
                <h2 className="mt-2 text-2xl font-black">
                  What buyers can see
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-[#6f6a63]">
                  Your public profile affects trust, search ranking and booking
                  conversion. Keep it clear and specific.
                </p>
              </div>

              <Link
                href="/become-expert"
                className="w-fit rounded-full bg-[#151515] px-5 py-3 text-sm font-black text-white transition hover:bg-[#2563eb]"
              >
                Edit profile
              </Link>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <SettingCard
                title="Headline"
                text={expert?.headline ?? "No headline added yet."}
              />
              <SettingCard
                title="Bio"
                text={
                  expert?.bio
                    ? expert.bio.slice(0, 140) + (expert.bio.length > 140 ? "..." : "")
                    : "No bio added yet."
                }
              />
              <SettingCard
                title="Skills"
                text={
                  expert?.skills.length
                    ? expert.skills.join(", ")
                    : "No skills added yet."
                }
              />
              <SettingCard
                title="Languages"
                text={
                  expert?.languages.length
                    ? expert.languages.join(", ")
                    : "No languages added yet."
                }
              />
            </div>
          </div>

          <div className="card rounded-[2rem] p-6">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <p className="text-sm font-black text-[#f97316]">
                  Session preferences
                </p>
                <h2 className="mt-2 text-2xl font-black">
                  How you work with buyers
                </h2>
              </div>

              <Link
                href="/expert/availability"
                className="w-fit rounded-full bg-[#2563eb] px-5 py-3 text-sm font-black text-white transition hover:bg-[#1d4ed8]"
              >
                Manage availability
              </Link>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <PreferenceCard
                title="Meeting format"
                value="Video session"
                text="Sessions are handled through the integrated video room."
              />
              <PreferenceCard
                title="Booking model"
                value="Short 1:1 calls"
                text="Focus on clear, fast outcomes instead of long projects."
              />
              <PreferenceCard
                title="Current services"
                value={`${expert?.services.length ?? 0} active`}
                text="Create focused offers like CV Review or Mock Interview."
              />
              <PreferenceCard
                title="Current slots"
                value={`${expert?.availability.length ?? 0} total`}
                text="More available time usually increases booking chances."
              />
            </div>
          </div>

          <div className="card rounded-[2rem] p-6">
            <p className="text-sm font-black text-[#2563eb]">
              Notification preferences
            </p>

            <h2 className="mt-2 text-2xl font-black">Important alerts</h2>

            <div className="mt-6 space-y-3">
              <NotificationRow
                title="New booking request"
                text="Get notified when a buyer books or pays for a service."
              />
              <NotificationRow
                title="Upcoming session"
                text="Reminder before the session starts."
              />
              <NotificationRow
                title="New review"
                text="Know when a completed session receives feedback."
              />
              <NotificationRow
                title="Profile moderation"
                text="Updates when your profile is reviewed or verified."
              />
            </div>

            <p className="mt-5 text-sm text-[#6f6a63]">
              We can connect these settings to real email preferences in the next
              step.
            </p>
          </div>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-28 lg:h-fit">
          <div className="card rounded-[2rem] p-6">
            <p className="text-sm font-black text-[#f97316]">
              Expert options
            </p>

            <div className="mt-5 grid gap-3">
              <QuickAction
                href="/expert"
                title="Overview"
                text="Return to your main dashboard."
              />
              <QuickAction
                href="/expert/bookings"
                title="Bookings"
                text="Manage requests and sessions."
              />
              <QuickAction
                href="/expert/availability"
                title="Availability"
                text="Open or close time slots."
              />
              <QuickAction
                href="/expert/earnings"
                title="Earnings"
                text="Track revenue and payouts."
              />
            </div>
          </div>

          <div className="card rounded-[2rem] p-6">
            <p className="text-sm font-black text-[#2563eb]">Account health</p>

            <div className="mt-5 space-y-3 rounded-[1.5rem] bg-[#f7f4ef] p-5">
              <SummaryRow
                label="Profile status"
                value={expert?.status ?? "Not created"}
              />
              <SummaryRow
                label="Verified"
                value={expert?.isVerified ? "Yes" : "No"}
              />
              <SummaryRow
                label="Services"
                value={`${expert?.services.length ?? 0}`}
              />
              <SummaryRow
                label="Availability slots"
                value={`${expert?.availability.length ?? 0}`}
              />
              <SummaryRow
                label="Reviews"
                value={`${expert?.reviews.length ?? 0}`}
              />
            </div>
          </div>

          <div className="card rounded-[2rem] p-6">
            <p className="text-sm font-black text-[#2563eb]">
              Suggested next step
            </p>

            <div className="mt-5 rounded-[1.5rem] bg-[#eef4ff] p-5">
              <p className="font-black text-[#2563eb]">
                Improve booking readiness
              </p>
              <p className="mt-2 text-sm leading-6 text-[#6f6a63]">
                Add more availability, refine your public profile and keep your
                services outcome-focused to convert more visitors into buyers.
              </p>
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[#e8e1d8] pb-3 last:border-0 last:pb-0">
      <span className="text-sm text-[#6f6a63]">{label}</span>
      <span className="text-right text-sm font-black">{value}</span>
    </div>
  );
}

function SettingCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[1.5rem] bg-[#f7f4ef] p-5">
      <p className="text-sm font-black text-[#151515]">{title}</p>
      <p className="mt-2 text-sm leading-6 text-[#6f6a63]">{text}</p>
    </div>
  );
}

function PreferenceCard({
  title,
  value,
  text,
}: {
  title: string;
  value: string;
  text: string;
}) {
  return (
    <div className="rounded-[1.5rem] bg-[#f7f4ef] p-5">
      <p className="text-sm font-black text-[#2563eb]">{title}</p>
      <p className="mt-3 text-2xl font-black">{value}</p>
      <p className="mt-2 text-sm leading-6 text-[#6f6a63]">{text}</p>
    </div>
  );
}

function NotificationRow({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-[1.5rem] bg-[#f7f4ef] p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-black">{title}</p>
          <p className="mt-1 text-sm leading-6 text-[#6f6a63]">{text}</p>
        </div>

        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-black text-green-700">
          ON
        </span>
      </div>
    </div>
  );
}

function QuickAction({
  href,
  title,
  text,
}: {
  href: string;
  title: string;
  text: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-[1.5rem] bg-[#f7f4ef] p-4 transition hover:bg-[#eef4ff]"
    >
      <p className="font-black">{title}</p>
      <p className="mt-1 text-sm leading-6 text-[#6f6a63]">{text}</p>
    </Link>
  );
}