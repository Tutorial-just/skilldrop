import Link from "next/link";
import { signInAction } from "@/server/actions/auth.actions";

type SignInPageProps = {
  searchParams?: Promise<{
    next?: string;
    error?: string;
    required?: string;
  }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const next = resolvedSearchParams.next ?? "";
  const error = resolvedSearchParams.error;
  const required = resolvedSearchParams.required;

  return (
    <main className="container-page flex min-h-[calc(100vh-120px)] items-center py-12">
      <section className="mx-auto grid w-full max-w-5xl gap-8 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-[2.5rem] bg-[#151515] p-8 text-white md:p-10">
          <Link
            href="/"
            className="inline-flex rounded-full bg-white/10 px-4 py-2 text-sm font-black text-white"
          >
            ← Back home
          </Link>

          <p className="mt-10 text-sm font-black text-[#f97316]">
            SkillDrop access
          </p>

          <h1 className="mt-4 text-5xl font-black tracking-tight">
            Sign in to your workspace.
          </h1>

          <p className="mt-5 text-lg leading-8 text-white/60">
            Buyers manage bookings, experts manage sessions, and admins operate
            the marketplace.
          </p>

          <div className="mt-8 grid gap-3">
            <AccessCard title="Buyer" text="View bookings and sessions." />
            <AccessCard title="Expert" text="Manage bookings and earnings." />
            <AccessCard title="Admin" text="Moderate experts and metrics." />
          </div>
        </div>

        <div className="card rounded-[2.5rem] p-6 md:p-8">
          <p className="text-sm font-black text-[#2563eb]">Sign in</p>

          <h2 className="mt-3 text-3xl font-black tracking-tight">
            Choose your role.
          </h2>

          <p className="mt-3 leading-7 text-[#6f6a63]">
            Buyer access does not require a passcode. Expert and Admin access
            use passcodes from your environment variables.
          </p>

          {required ? (
            <div className="mt-6 rounded-[1.5rem] bg-[#eef4ff] p-5">
              <p className="font-black text-[#2563eb]">Role required</p>
              <p className="mt-2 text-sm leading-6 text-[#6f6a63]">
                The page you tried to open requires:{" "}
                <span className="font-black">{required}</span>.
              </p>
            </div>
          ) : null}

          {error ? (
            <div className="mt-6 rounded-[1.5rem] bg-[#fff3e8] p-5">
              <p className="font-black text-[#f97316]">Access denied</p>
              <p className="mt-2 text-sm leading-6 text-[#6f6a63]">
                The passcode is incorrect or your role does not have access to
                that page.
              </p>
            </div>
          ) : null}

          <form action={signInAction} className="mt-8 space-y-6">
            <input type="hidden" name="next" value={next} />

            <div>
              <label className="text-sm font-black">Role</label>
              <select
                required
                name="role"
                defaultValue="BUYER"
                className="input-field mt-2"
              >
                <option value="BUYER">Buyer</option>
                <option value="EXPERT">Expert</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-black">Passcode</label>
              <input
                name="passcode"
                placeholder="Required for Expert/Admin"
                className="input-field mt-2"
              />
              <p className="mt-2 text-sm text-[#6f6a63]">
                Buyer can continue without passcode.
              </p>
            </div>

            <button
              type="submit"
              className="w-full rounded-2xl bg-[#2563eb] px-7 py-4 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-[#1d4ed8]"
            >
              Continue
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}

function AccessCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[1.5rem] bg-white/10 p-5">
      <p className="font-black">{title}</p>
      <p className="mt-1 text-sm leading-6 text-white/55">{text}</p>
    </div>
  );
}