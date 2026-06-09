import { redirect } from "next/navigation";
import { ArrowRight, LogIn, ShieldCheck } from "lucide-react";

import { signInAction } from "@/server/actions/auth.actions";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

function getDashboardHref(role?: string | null) {
  const normalizedRole = role?.toLowerCase();

  if (normalizedRole === "expert") {
    return "/expert";
  }

  if (normalizedRole === "admin") {
    return "/admin";
  }

  return "/buyer";
}

type SignInPageProps = {
  searchParams?: Promise<{
    error?: string;
    next?: string;
  }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const safeNext =
    resolvedSearchParams.next?.startsWith("/") && !resolvedSearchParams.next.startsWith("//")
      ? resolvedSearchParams.next
      : "";
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user?.email) {
    const dbUser = await prisma.user.findUnique({
      where: {
        email: user.email.toLowerCase(),
      },
      select: {
        role: true,
      },
    });

    redirect(getDashboardHref(dbUser?.role ?? user.user_metadata?.role));
  }

  return (
    <main className="relative min-h-[calc(100vh-76px)] overflow-hidden">
      <div className="surface-grid absolute inset-0 opacity-40" />

      <section className="relative container-page grid min-h-[calc(100vh-76px)] items-center gap-10 py-12 lg:grid-cols-[0.9fr_1fr]">
        <div>
          <Badge variant="primary">
            <ShieldCheck size={14} />
            Secure access
          </Badge>

          <h1 className="heading-lg mt-6 max-w-xl text-balance">
            Sign in to your workspace.
          </h1>

          <p className="mt-5 max-w-xl text-lg leading-8 text-muted">
            Clients continue to their booking dashboard. Experts continue to
            their expert workspace.
          </p>
        </div>

        <Card className="mx-auto w-full max-w-xl p-6 md:p-8">
          <Badge variant="accent">
            <LogIn size={14} />
            Welcome back
          </Badge>

          <h2 className="mt-5 text-3xl font-black tracking-[-0.05em]">
            Sign in
          </h2>

          {resolvedSearchParams.error ? (
            <div className="mt-5 rounded-2xl border border-[var(--danger)]/20 bg-[var(--danger-soft)] p-4 text-sm font-bold text-[var(--danger)]">
              {resolvedSearchParams.error === "auth-config-missing"
                ? "Authentication is not configured yet. Add Supabase environment variables before launching."
                : resolvedSearchParams.error}
            </div>
          ) : null}

          <form action={signInAction} className="mt-7 grid gap-5">
            <input type="hidden" name="next" value={safeNext} />
            <div>
              <label htmlFor="email" className="text-sm font-black">
                Email
              </label>

              <input
                id="email"
                name="email"
                type="email"
                required
                className="input mt-2"
                placeholder="you@example.com"
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
                className="input mt-2"
                placeholder="••••••••"
              />
            </div>

            <button type="submit" className="btn btn-primary">
              Sign in
              <ArrowRight size={18} />
            </button>
          </form>

          <p className="mt-6 text-center text-sm font-bold text-muted">
            New to SkillDrop?{" "}
            <a href="/sign-up" className="font-black text-[var(--primary-dark)]">
              Create account
            </a>
          </p>
        </Card>
      </section>
    </main>
  );
}