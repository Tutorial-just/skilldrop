import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { signOutAction } from "@/server/actions/auth.actions";
import { WorkspaceNav } from "@/components/layout/workspace-nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "SkillDrop — Expert career help in 15 minutes",
  description:
    "Book short 1:1 sessions for CV reviews, LinkedIn feedback and interview preparation.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const role = cookieStore.get("skilldrop_role")?.value ?? null;

  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <header className="sticky top-0 z-50 border-b border-[#e8e1d8]/80 bg-[#f7f4ef]/90 backdrop-blur-xl">
          <div className="container-page flex h-[72px] items-center justify-between gap-4">
            <Link href="/" className="flex shrink-0 items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#2563eb] text-sm font-black text-white">
                S
              </div>

              <div className="leading-tight">
                <p className="text-lg font-black tracking-tight">SkillDrop</p>
                <p className="hidden text-xs text-[#6f6a63] sm:block">
                  expert help, fast
                </p>
              </div>
            </Link>

            <nav className="hidden items-center gap-2 text-sm font-medium text-[#6f6a63] lg:flex">
              {!role ? (
                <>
                  <NavLink href="/#how-it-works" label="How it works" />
                  <NavLink href="/#for-experts" label="For experts" />
                  <NavLink href="/pricing" label="Pricing" />
                </>
              ) : null}

              {role === "BUYER" ? (
                <>
                  <NavLink href="/buyer" label="Dashboard" />
                  <NavLink href="/experts" label="Find experts" />
                  <NavLink href="/categories" label="Categories" />

                  <NavGroup label="My account">
                    <DropdownLink href="/buyer" label="Overview" />
                    <DropdownLink
                      href="/dashboard/bookings"
                      label="Bookings"
                    />
                  </NavGroup>
                </>
              ) : null}

              {role === "EXPERT" ? (
                <>
                  <NavLink href="/expert" label="Dashboard" />
                  <NavLink href="/expert/bookings" label="Bookings" />
                  <NavLink href="/expert/availability" label="Availability" />
                  <NavLink href="/expert/earnings" label="Earnings" />

                  <NavGroup label="Settings">
                    <DropdownLink
                      href="/expert/settings"
                      label="Expert settings"
                    />
                    <DropdownLink
                      href="/become-expert"
                      label="Public profile"
                    />
                  </NavGroup>

                  <NavGroup label="Marketplace">
                    <DropdownLink href="/experts" label="Find experts" />
                    <DropdownLink href="/categories" label="Categories" />
                    <DropdownLink href="/pricing" label="Pricing" />
                  </NavGroup>
                </>
              ) : null}

              {role === "ADMIN" ? (
                <>
                  <NavLink href="/admin" label="Admin" />
                  <NavLink href="/admin/metrics" label="Metrics" />
                  <NavLink href="/admin/experts" label="Experts" />

                  <NavGroup label="Expert tools">
                    <DropdownLink href="/expert" label="Expert overview" />
                    <DropdownLink href="/expert/bookings" label="Bookings" />
                    <DropdownLink
                      href="/expert/availability"
                      label="Availability"
                    />
                    <DropdownLink href="/expert/earnings" label="Earnings" />
                    <DropdownLink href="/expert/settings" label="Settings" />
                  </NavGroup>

                  <NavGroup label="Marketplace">
                    <DropdownLink href="/experts" label="Find experts" />
                    <DropdownLink href="/categories" label="Categories" />
                    <DropdownLink
                      href="/become-expert"
                      label="Become expert"
                    />
                    <DropdownLink href="/pricing" label="Pricing" />
                  </NavGroup>
                </>
              ) : null}
            </nav>

            <div className="flex items-center gap-2">
              {role ? <RoleBadge role={role} /> : null}

              {role ? (
                <form action={signOutAction} className="hidden md:block">
                  <button className="rounded-full px-4 py-2 text-sm font-semibold text-[#6f6a63] transition hover:bg-white hover:text-[#151515]">
                    Sign out
                  </button>
                </form>
              ) : (
                <Link
                  href="/sign-in"
                  className="hidden rounded-full px-4 py-2 text-sm font-semibold text-[#6f6a63] transition hover:bg-white hover:text-[#151515] md:block"
                >
                  Sign in
                </Link>
              )}

              <Link
                href={role ? "/experts" : "/sign-in?next=/buyer"}
                className="rounded-full bg-[#151515] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#2563eb] sm:px-5"
              >
                {role ? "Book" : "Get started"}
              </Link>
            </div>
          </div>

          <nav className="container-page flex gap-2 overflow-x-auto pb-3 lg:hidden">
            {!role ? (
              <>
                <MobileNav href="/#how-it-works" label="How it works" />
                <MobileNav href="/#for-experts" label="Experts" />
                <MobileNav href="/pricing" label="Pricing" />
              </>
            ) : null}

            {role === "BUYER" ? (
              <>
                <MobileNav href="/buyer" label="Dashboard" />
                <MobileNav href="/experts" label="Experts" />
                <MobileNav href="/dashboard/bookings" label="Bookings" />
                <MobileNav href="/categories" label="Categories" />
              </>
            ) : null}

            {role === "EXPERT" ? (
              <>
                <MobileNav href="/expert" label="Dashboard" />
                <MobileNav href="/expert/bookings" label="Bookings" />
                <MobileNav href="/expert/availability" label="Slots" />
                <MobileNav href="/expert/earnings" label="Earnings" />
                <MobileNav href="/expert/settings" label="Settings" />
              </>
            ) : null}

            {role === "ADMIN" ? (
              <>
                <MobileNav href="/admin" label="Admin" />
                <MobileNav href="/admin/metrics" label="Metrics" />
                <MobileNav href="/admin/experts" label="Experts" />
                <MobileNav href="/expert" label="Expert" />
                <MobileNav href="/experts" label="Marketplace" />
              </>
            ) : null}
          </nav>
        </header>

        <WorkspaceNav role={role} />

        {children}

        <SiteFooter />
      </body>
    </html>
  );
}

function RoleBadge({ role }: { role: string }) {
  const styles: Record<string, string> = {
    BUYER: "bg-[#eef4ff] text-[#2563eb]",
    EXPERT: "bg-green-100 text-green-700",
    ADMIN: "bg-[#151515] text-white",
  };

  return (
    <span
      className={`hidden rounded-full px-3 py-1.5 text-xs font-black md:inline-flex ${
        styles[role] ?? "bg-[#f7f4ef] text-[#6f6a63]"
      }`}
    >
      {role}
    </span>
  );
}

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-full px-4 py-2 font-semibold transition hover:bg-white hover:text-[#151515]"
    >
      {label}
    </Link>
  );
}

function NavGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="group relative">
      <button className="rounded-full px-4 py-2 font-semibold transition hover:bg-white hover:text-[#151515] group-hover:bg-white group-hover:text-[#151515]">
        {label} ↓
      </button>

      <div className="invisible absolute right-0 top-full z-50 w-60 pt-3 opacity-0 transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
        <div className="rounded-[1.25rem] border border-[#e8e1d8] bg-white p-2 shadow-2xl shadow-black/10">
          {children}
        </div>
      </div>
    </div>
  );
}

function DropdownLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="block rounded-2xl px-4 py-3.5 text-sm font-bold text-[#6f6a63] transition hover:bg-[#f7f4ef] hover:text-[#151515]"
    >
      {label}
    </Link>
  );
}

function MobileNav({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="shrink-0 rounded-full border border-[#e8e1d8] bg-white px-4 py-2 text-xs font-black text-[#6f6a63]"
    >
      {label}
    </Link>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-[#e8e1d8] bg-[#f7f4ef]">
      <div className="container-page py-12">
        <div className="grid gap-10 md:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr]">
          <div>
            <Link href="/" className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#2563eb] text-sm font-black text-white">
                S
              </div>

              <div>
                <p className="text-lg font-black tracking-tight">SkillDrop</p>
                <p className="-mt-1 text-xs text-[#6f6a63]">
                  expert help, fast
                </p>
              </div>
            </Link>

            <p className="mt-5 max-w-sm leading-7 text-[#6f6a63]">
              Book short 1:1 sessions with career experts for CV reviews,
              LinkedIn feedback and interview preparation.
            </p>
          </div>

          <FooterColumn
            title="Marketplace"
            links={[
              { href: "/", label: "Home" },
              { href: "/pricing", label: "Pricing" },
              { href: "/become-expert", label: "For experts" },
            ]}
          />

          <FooterColumn
            title="Client"
            links={[
              { href: "/sign-in?next=/buyer", label: "Create client account" },
              { href: "/buyer", label: "Client dashboard" },
              { href: "/dashboard/bookings", label: "Bookings" },
            ]}
          />

          <FooterColumn
            title="Expert"
            links={[
              { href: "/become-expert", label: "Apply as expert" },
              { href: "/expert", label: "Expert dashboard" },
              { href: "/expert/bookings", label: "Bookings" },
              { href: "/expert/availability", label: "Availability" },
              { href: "/expert/earnings", label: "Earnings" },
              { href: "/expert/settings", label: "Settings" },
            ]}
          />
        </div>

        <div className="mt-10 flex flex-col justify-between gap-4 border-t border-[#e8e1d8] pt-6 text-sm text-[#6f6a63] md:flex-row md:items-center">
          <p>
            © {new Date().getFullYear()} SkillDrop. Built for focused expert
            sessions.
          </p>

          <div className="flex flex-wrap gap-4">
            <span>Secure checkout</span>
            <span>Video sessions</span>
            <span>Verified experts</span>
            <span>Transparent pricing</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: {
    href: string;
    label: string;
  }[];
}) {
  return (
    <div>
      <h3 className="font-black">{title}</h3>

      <div className="mt-4 space-y-3">
        {links.map((link) => (
          <Link
            key={link.href + link.label}
            href={link.href}
            className="block text-sm font-medium text-[#6f6a63] transition hover:text-[#151515]"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}