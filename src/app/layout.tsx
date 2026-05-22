import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { ArrowRight, Bell, LayoutDashboard, Sparkles } from "lucide-react";

import "./globals.css";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { SiteFooter } from "@/components/layout/site-footer";
import { WorkspaceNav } from "@/components/layout/workspace-nav";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getUnreadNotificationCount } from "@/server/services/notification-count.service";

const appUrl =
  process.env.NEXT_PUBLIC_APP_URL || "https://skilldrop-dusky.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "SkillDrop — Practical help in short 1:1 calls.",
    template: "%s · SkillDrop",
  },
  description:
    "Book short 1:1 calls with real people who can help with documents, career, languages, tech, relocation, studies and everyday decisions.",
  applicationName: "SkillDrop",
  keywords: [
    "SkillDrop",
    "short calls",
    "1:1 advice",
    "CV review",
    "translation help",
    "relocation advice",
    "career help",
    "document help",
    "tech help",
    "online consultation",
  ],
  authors: [{ name: "SkillDrop" }],
  creator: "SkillDrop",
  publisher: "SkillDrop",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "SkillDrop — Practical help in short 1:1 calls.",
    description:
      "Book short 1:1 calls with real people who can help with documents, career, languages, tech, relocation, studies and everyday decisions.",
    url: "/",
    siteName: "SkillDrop",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "SkillDrop — Practical help in short 1:1 calls.",
    description:
      "Book short 1:1 calls with real people who can help with documents, career, languages, tech, relocation, studies and everyday decisions.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    {
      media: "(prefers-color-scheme: light)",
      color: "#ffffff",
    },
    {
      media: "(prefers-color-scheme: dark)",
      color: "#0f1117",
    },
  ],
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

function normalizeRole(role: unknown): string | null {
  if (typeof role !== "string") {
    return null;
  }

  const normalizedRole = role.toUpperCase();

  if (
    normalizedRole === "BUYER" ||
    normalizedRole === "EXPERT" ||
    normalizedRole === "ADMIN"
  ) {
    return normalizedRole;
  }

  return null;
}

async function getHeaderSession() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return {
      user: null,
      role: null,
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

  const role = normalizeRole(dbUser?.role ?? user.user_metadata?.role);

  const dashboardHref =
    role === "EXPERT" ? "/expert" : role === "ADMIN" ? "/admin" : "/buyer";

  const unreadNotifications = await getUnreadNotificationCount({
    userId: dbUser?.id,
    email,
  });

  return {
    user,
    role,
    dashboardHref,
    unreadNotifications,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { user, role, dashboardHref, unreadNotifications } =
    await getHeaderSession();

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
                    Practical help. Short calls.
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
                          {unreadNotifications > 99
                            ? "99+"
                            : unreadNotifications}
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

          <WorkspaceNav role={role} />

          <div className="flex-1">{children}</div>

          <SiteFooter />
        </div>
      </body>
    </html>
  );
}