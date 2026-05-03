import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, LayoutDashboard, Sparkles } from "lucide-react";

import "./globals.css";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "SkillDrop — Real people. Useful advice. Short calls.",
  description:
    "Book short 1:1 calls with people who can advise, translate, support, explain or help you solve practical life problems.",
};

const themeScript = `
  (function() {
    try {
      var theme = localStorage.getItem('skilldrop-theme') || 'system';
      var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

      document.documentElement.classList.remove('theme-light', 'theme-dark');

      if (theme === 'dark' || (theme === 'system' && prefersDark)) {
        document.documentElement.classList.add('theme-dark');
      } else {
        document.documentElement.classList.add('theme-light');
      }
    } catch (e) {}
  })();
`;

async function getHeaderSession() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      user: null,
      dashboardHref: "/sign-in",
    };
  }

  const role = user.user_metadata?.role as string | undefined;

  if (role === "expert") {
    return {
      user,
      dashboardHref: "/expert",
    };
  }

  if (role === "admin") {
    return {
      user,
      dashboardHref: "/admin",
    };
  }

  return {
    user,
    dashboardHref: "/buyer",
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { user, dashboardHref } = await getHeaderSession();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>

      <body>
        <div className="min-h-screen">
          <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-white/72 backdrop-blur-xl theme-dark:bg-[#0f1117]/72">
            <div className="container-page flex h-[76px] items-center justify-between gap-4">
              <Link href="/" className="group flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[#8b5cf6] text-white shadow-sm">
                  <Sparkles size={20} />
                </div>

                <div>
                  <p className="text-lg font-black tracking-[-0.04em]">
                    SkillDrop
                  </p>
                  <p className="hidden text-xs font-bold text-muted sm:block">
                    Useful advice. Short calls.
                  </p>
                </div>
              </Link>

              <nav className="flex items-center gap-2">
                {user ? (
                  <>
                    <Link
                      href={dashboardHref}
                      className="btn btn-secondary hidden sm:inline-flex"
                    >
                      <LayoutDashboard size={17} />
                      Dashboard
                    </Link>

                    <SignOutButton />
                  </>
                ) : (
                  <>
                    <Link
                      href="/sign-in"
                      className="btn btn-secondary hidden sm:inline-flex"
                    >
                      Sign in
                    </Link>

                    <Link href="/sign-up" className="btn btn-primary">
                      Create account
                      <ArrowRight size={17} />
                    </Link>
                  </>
                )}
              </nav>
            </div>
          </header>

          {children}

          <footer className="border-t border-[var(--border)] bg-white/35 py-10 theme-dark:bg-white/[0.03]">
            <div className="container-page">
              <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[#8b5cf6] text-white">
                      <Sparkles size={18} />
                    </div>

                    <p className="text-lg font-black tracking-[-0.04em]">
                      SkillDrop
                    </p>
                  </div>

                  <p className="mt-3 max-w-xl text-sm leading-6 text-muted">
                    A marketplace for short 1:1 calls with people who can help
                    with work, life, languages, support, documents, moving
                    abroad and much more.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3 text-sm font-bold text-muted">
                  {user ? (
                    <>
                      <Link
                        href={dashboardHref}
                        className="hover:text-[var(--foreground)]"
                      >
                        Dashboard
                      </Link>

                      <Link
                        href="/expert/settings"
                        className="hover:text-[var(--foreground)]"
                      >
                        Settings
                      </Link>
                    </>
                  ) : (
                    <>
                      <Link
                        href="/sign-in"
                        className="hover:text-[var(--foreground)]"
                      >
                        Sign in
                      </Link>

                      <Link
                        href="/sign-up"
                        className="hover:text-[var(--foreground)]"
                      >
                        Create account
                      </Link>

                      <Link
                        href="/sign-up?role=expert"
                        className="hover:text-[var(--foreground)]"
                      >
                        Offer help
                      </Link>
                    </>
                  )}
                </div>
              </div>

              <div className="mt-8 border-t border-[var(--border)] pt-6 text-sm font-semibold text-muted">
                © {new Date().getFullYear()} SkillDrop. All rights reserved.
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}