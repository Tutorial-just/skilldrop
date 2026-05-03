import Link from "next/link";
import {
  ArrowRight,
  BriefcaseBusiness,
  Sparkles,
  UserRound,
} from "lucide-react";

import { signUpAction } from "@/server/actions/auth.actions";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

type SignUpPageProps = {
  searchParams?: Promise<{
    role?: string;
    error?: string;
  }>;
};

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const selectedRole =
    resolvedSearchParams.role === "expert" ? "expert" : "buyer";

  return (
    <main className="section-page">
      <div className="container-page">
        <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <Badge variant="primary">
              <Sparkles size={14} />
              Join SkillDrop
            </Badge>

            <h1 className="heading-lg mt-5 text-balance">
              Create your workspace.
            </h1>

            <p className="mt-5 text-lg leading-8 text-muted">
              Start as a client to book expert help, or as an expert to offer
              focused sessions.
            </p>

            <div className="mt-8 grid gap-3">
              <RolePreview
                icon={UserRound}
                title="Client workspace"
                text="Find experts, book sessions, and manage upcoming calls."
              />

              <RolePreview
                icon={BriefcaseBusiness}
                title="Expert workspace"
                text="Create services, set availability, and manage bookings."
              />
            </div>
          </div>

          <Card className="p-6 md:p-8">
            <Badge variant="accent">Create account</Badge>

            <h2 className="mt-4 text-3xl font-black tracking-[-0.05em]">
              Sign up
            </h2>

            {resolvedSearchParams.error ? (
              <div className="mt-5 rounded-2xl border border-[var(--danger)]/20 bg-[var(--danger-soft)] p-4 text-sm font-bold text-[var(--danger)]">
                {resolvedSearchParams.error}
              </div>
            ) : null}

            <form action={signUpAction} className="mt-6 grid gap-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="cursor-pointer">
                  <input
                    type="radio"
                    name="role"
                    value="buyer"
                    defaultChecked={selectedRole === "buyer"}
                    className="peer sr-only"
                  />

                  <div className="rounded-[22px] border border-[var(--border)] bg-white/70 p-4 transition peer-checked:border-[var(--primary)] peer-checked:bg-[var(--primary-soft)]">
                    <UserRound
                      size={20}
                      className="text-[var(--primary-dark)]"
                    />
                    <p className="mt-3 font-black">Client</p>
                    <p className="mt-1 text-sm text-muted">Book expert help</p>
                  </div>
                </label>

                <label className="cursor-pointer">
                  <input
                    type="radio"
                    name="role"
                    value="expert"
                    defaultChecked={selectedRole === "expert"}
                    className="peer sr-only"
                  />

                  <div className="rounded-[22px] border border-[var(--border)] bg-white/70 p-4 transition peer-checked:border-[var(--primary)] peer-checked:bg-[var(--primary-soft)]">
                    <BriefcaseBusiness
                      size={20}
                      className="text-[var(--primary-dark)]"
                    />
                    <p className="mt-3 font-black">Expert</p>
                    <p className="mt-1 text-sm text-muted">Offer sessions</p>
                  </div>
                </label>
              </div>

              <div>
                <label htmlFor="name" className="text-sm font-black">
                  Full name
                </label>

                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  placeholder="Anna Keller"
                  className="input mt-2"
                />
              </div>

              <div>
                <label htmlFor="email" className="text-sm font-black">
                  Email
                </label>

                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="you@example.com"
                  className="input mt-2"
                />
              </div>

              <div>
                <label htmlFor="password" className="text-sm font-black">
                  Password
                </label>

                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  minLength={8}
                  placeholder="At least 8 characters"
                  className="input mt-2"
                />
              </div>

              <button type="submit" className="btn btn-primary mt-2">
                Create account
                <ArrowRight size={18} />
              </button>
            </form>

            <p className="mt-6 text-center text-sm font-semibold text-muted">
              Already have an account?{" "}
              <Link
                href="/sign-in"
                className="font-black text-[var(--primary-dark)]"
              >
                Sign in
              </Link>
            </p>
          </Card>
        </div>
      </div>
    </main>
  );
}

function RolePreview({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof UserRound;
  title: string;
  text: string;
}) {
  return (
    <div className="flex gap-4 rounded-[22px] border border-[var(--border)] bg-white/60 p-4 backdrop-blur">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary-dark)]">
        <Icon size={20} />
      </div>

      <div>
        <p className="font-black">{title}</p>
        <p className="mt-1 text-sm leading-6 text-muted">{text}</p>
      </div>
    </div>
  );
}