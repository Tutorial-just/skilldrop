import Link from "next/link";

export default function BuyerSettingsPage() {
  return (
    <main className="container-page py-10">
      <section className="rounded-[2rem] bg-[#151515] p-6 text-white sm:rounded-[2.5rem] md:p-10">
        <div className="max-w-3xl">
          <p className="text-sm font-black text-[#f97316]">Client settings</p>

          <h1 className="mt-4 text-4xl font-black tracking-tight md:text-5xl">
            Personalize your SkillDrop experience.
          </h1>

          <p className="mt-4 text-lg leading-8 text-white/60">
            Manage your learning goals, preferred topics, language, notifications
            and booking preferences.
          </p>
        </div>
      </section>

      <section className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <div className="card rounded-[2rem] p-6">
            <p className="text-sm font-black text-[#2563eb]">Profile</p>

            <h2 className="mt-2 text-2xl font-black">Your client profile</h2>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <Field label="Full name">
                <input className="input-field" placeholder="Alex Johnson" />
              </Field>

              <Field label="Email">
                <input
                  className="input-field"
                  placeholder="alex@email.com"
                  type="email"
                />
              </Field>

              <Field label="Country">
                <input className="input-field" placeholder="France" />
              </Field>

              <Field label="Preferred language">
                <select className="input-field" defaultValue="English">
                  <option>English</option>
                  <option>French</option>
                  <option>Russian</option>
                  <option>Spanish</option>
                  <option>German</option>
                </select>
              </Field>
            </div>
          </div>

          <div className="card rounded-[2rem] p-6">
            <p className="text-sm font-black text-[#f97316]">Career goals</p>

            <h2 className="mt-2 text-2xl font-black">
              What do you want help with?
            </h2>

            <div className="mt-6 grid gap-3 md:grid-cols-2">
              <Preference title="CV Review" />
              <Preference title="Mock Interview" />
              <Preference title="LinkedIn Review" />
              <Preference title="Remote Jobs" />
              <Preference title="React Interview" />
              <Preference title="Portfolio Review" />
            </div>
          </div>

          <div className="card rounded-[2rem] p-6">
            <p className="text-sm font-black text-[#2563eb]">Notifications</p>

            <h2 className="mt-2 text-2xl font-black">Session updates</h2>

            <div className="mt-6 space-y-3">
              <NotificationRow
                title="Booking confirmations"
                text="Receive updates when a session is booked or changed."
              />
              <NotificationRow
                title="Session reminders"
                text="Get reminded before an upcoming video session."
              />
              <NotificationRow
                title="Expert replies"
                text="Receive alerts when an expert responds to your request."
              />
            </div>
          </div>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-28 lg:h-fit">
          <div className="card rounded-[2rem] p-6">
            <p className="text-sm font-black text-[#f97316]">Client options</p>

            <div className="mt-5 grid gap-3">
              <QuickAction
                href="/buyer"
                title="Dashboard"
                text="Return to your client overview."
              />
              <QuickAction
                href="/experts"
                title="Find experts"
                text="Search for a specialist."
              />
              <QuickAction
                href="/dashboard/bookings"
                title="Bookings"
                text="Manage your sessions."
              />
              <QuickAction
                href="/categories"
                title="Categories"
                text="Browse by problem."
              />
            </div>
          </div>

          <div className="card rounded-[2rem] p-6">
            <p className="text-sm font-black text-[#2563eb]">
              Suggested setup
            </p>

            <div className="mt-5 rounded-[1.5rem] bg-[#eef4ff] p-5">
              <p className="font-black text-[#2563eb]">
                Add your career goals
              </p>
              <p className="mt-2 text-sm leading-6 text-[#6f6a63]">
                Later we will use this information to recommend better experts,
                categories and sessions.
              </p>
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-black">{label}</span>
      <div className="mt-2">{children}</div>
    </label>
  );
}

function Preference({ title }: { title: string }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-[1.5rem] bg-[#f7f4ef] p-4">
      <span className="font-black">{title}</span>
      <input type="checkbox" className="h-5 w-5" />
    </label>
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