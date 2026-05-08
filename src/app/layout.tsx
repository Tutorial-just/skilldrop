import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Bell, LayoutDashboard, Sparkles } from "lucide-react";

import "./globals.css";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getUnreadNotificationCount } from "@/server/services/notification-count.service";

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

  if (!user?.email) {
    return {
      user: null,
      dashboardHref: "/sign-in",
      unreadNotifications: 0,
    };
  }

  const email = user.email.toLowerCase();

  const dbUser = await prisma.user.findUnique({
    where: {
      email,
    },
    select: {
      id: true,
      role: true,
      email: true,
    },
  });

  const role = dbUser?.role ?? user.user_metadata?.role;

  const dashboardHref =
    role === "EXPERT" || role === "expert"
      ? "/expert"
      : role === "ADMIN" || role === "admin"
        ? "/admin"
        : "/buyer";

  const unreadNotifications = await getUnreadNotificationCount({
    userId: dbUser?.id,
    email,
  });

  return {
    user,
    dashboardHref,
    unreadNotifications,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { user, dashboardHref, unreadNotifications } = await getHeaderSession();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>

      <body>
        <div className="flex min-h-screen flex-col">
          <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-white/72 backdrop-blur-xl theme-dark:bg-[#0f1117]/72">
            <div className="container-page flex h-[76px] items-center justify-between gap-4">
              <Link href="/" className="group flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[#8b5cf6] text-white shadow-sm transition group-hover:scale-105">
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
                <Link
                  href="/help"
                  className="btn btn-secondary hidden md:inline-flex"
                >
                  Help
                </Link>

                {user ? (
                  <>
                    <Link
                      href={dashboardHref}
                      className="btn btn-secondary hidden sm:inline-flex"
                    >
                      <LayoutDashboard size={17} />
                      Dashboard
                    </Link>

                    <Link href="/notifications" className="btn btn-secondary">
                      <Bell size={17} />

                      <span className="hidden sm:inline">Notifications</span>

                      {unreadNotifications > 0 ? (
                        <span className="ml-1 rounded-full bg-[var(--primary)] px-2 py-0.5 text-xs font-black text-white">
                          {unreadNotifications}
                        </span>
                      ) : null}
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

          <div className="flex-1">{children}</div>

          <footer className="border-t border-[var(--border)] bg-white/35 py-10 theme-dark:bg-white/[0.03]">
            <div className="container-page">
              <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-start">
                <div>
                  <Link href="/" className="inline-flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[#8b5cf6] text-white">
                      <Sparkles size={18} />
                    </div>

                    <p className="text-lg font-black tracking-[-0.04em]">
                      SkillDrop
                    </p>
                  </Link>

                  <p className="mt-3 max-w-xl text-sm font-bold leading-6 text-muted">
                    A marketplace for short 1:1 calls with people who can help
                    with work, life, languages, support, documents, moving
                    abroad and practical decisions.
                  </p>
                </div>

                <div className="grid gap-5 sm:grid-cols-3">
                  <FooterGroup title="Platform">
                    <FooterLink href="/experts">Marketplace</FooterLink>
                    <FooterLink href="/help">Help</FooterLink>
                    <FooterLink href="/contact">Contact</FooterLink>

                    {user ? (
                      <>
                        <FooterLink href={dashboardHref}>Dashboard</FooterLink>
                        <FooterLink href="/notifications">
                          Notifications
                          {unreadNotifications > 0
                            ? ` · ${unreadNotifications}`
                            : ""}
                        </FooterLink>
                      </>
                    ) : (
                      <>
                        <FooterLink href="/sign-in">Sign in</FooterLink>
                        <FooterLink href="/sign-up">Create account</FooterLink>
                      </>
                    )}
                  </FooterGroup>

                  <FooterGroup title="For users">
                    <FooterLink href="/sign-up?role=buyer">
                      I need help
                    </FooterLink>
                    <FooterLink href="/sign-up?role=expert">
                      Offer help
                    </FooterLink>
                    <FooterLink href="/legal/safety">Safety</FooterLink>
                    <FooterLink href="/legal/refunds">Refunds</FooterLink>
                  </FooterGroup>

                  <FooterGroup title="Legal">
                    <FooterLink href="/legal/terms">Terms</FooterLink>
                    <FooterLink href="/legal/privacy">Privacy</FooterLink>
                    <FooterLink href="/legal/refunds">Refund policy</FooterLink>
                    <FooterLink href="/legal/safety">Safety & Trust</FooterLink>
                  </FooterGroup>
                </div>
              </div>

              <div className="mt-8 flex flex-col justify-between gap-3 border-t border-[var(--border)] pt-6 text-sm font-semibold text-muted md:flex-row md:items-center">
                <p>© {new Date().getFullYear()} SkillDrop. All rights reserved.</p>

                <p>MVP legal pages should be reviewed before public launch.</p>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}

function FooterGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
        {title}
      </p>

      <div className="mt-3 grid gap-2 text-sm font-bold text-muted">
        {children}
      </div>
    </div>
  );
}

function FooterLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="transition hover:text-[var(--foreground)]"
    >
      {children}
    </Link>
  );
}