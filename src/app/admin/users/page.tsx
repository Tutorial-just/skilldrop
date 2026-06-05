import Link from "next/link";
import type { Prisma, UserRole } from "@prisma/client";
import {
  ArrowLeft,
  BriefcaseBusiness,
  CalendarDays,
  Crown,
  Euro,
  Search,
  ShieldAlert,
  ShieldCheck,
  Star,
  UserRound,
  UsersRound,
} from "lucide-react";

import { requireRole } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import { updateUserRoleByAdminAction } from "@/server/actions/admin.actions";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

type AdminUsersPageProps = {
  searchParams?: Promise<{
    updated?: string;
    error?: string;
    role?: string;
    q?: string;
    page?: string;
  }>;
};

const userRoles: UserRole[] = ["BUYER", "EXPERT", "ADMIN"];

const ADMIN_USERS_PAGE_SIZE = 50;

export default async function AdminUsersPage({
  searchParams,
}: AdminUsersPageProps) {
  await requireRole(["admin"]);

  const resolvedSearchParams = searchParams ? await searchParams : {};

  const roleFilter = resolvedSearchParams.role ?? "all";
  const query = resolvedSearchParams.q?.trim() ?? "";
  const roleValue = roleFilter.toUpperCase() as UserRole;

  const requestedPage = Number(resolvedSearchParams.page ?? 1);
  const page =
    Number.isFinite(requestedPage) && requestedPage > 0
      ? Math.floor(requestedPage)
      : 1;

  const userWhere: Prisma.UserWhereInput = {
    ...(roleFilter !== "all" && userRoles.includes(roleValue)
      ? {
          role: roleValue,
        }
      : {}),

    ...(query
      ? {
          OR: [
            {
              id: {
                contains: query,
                mode: "insensitive" as const,
              },
            },
            {
              email: {
                contains: query,
                mode: "insensitive" as const,
              },
            },
            {
              name: {
                contains: query,
                mode: "insensitive" as const,
              },
            },
            {
              expertProfile: {
                is: {
                  OR: [
                    {
                      headline: {
                        contains: query,
                        mode: "insensitive" as const,
                      },
                    },
                    {
                      bio: {
                        contains: query,
                        mode: "insensitive" as const,
                      },
                    },
                    {
                      country: {
                        contains: query,
                        mode: "insensitive" as const,
                      },
                    },
                  ],
                },
              },
            },
          ],
        }
      : {}),
  };

  const filteredUsersCount = await prisma.user.count({
    where: userWhere,
  });

  const totalPages = Math.max(
    Math.ceil(filteredUsersCount / ADMIN_USERS_PAGE_SIZE),
    1,
  );

  const safePage = Math.min(page, totalPages);
  const skip = (safePage - 1) * ADMIN_USERS_PAGE_SIZE;

  const [
    users,
    totalUsers,
    buyersCount,
    expertsCount,
    adminsCount,
    expertsWithoutProfileCount,
    usersWithExpertProfileCount,
  ] = await Promise.all([
    prisma.user.findMany({
      where: userWhere,
      include: {
        expertProfile: true,
        bookings: {
          select: {
            id: true,
            status: true,
            priceCents: true,
            clientTotalCents: true,
          },
        },
        reviews: {
          select: {
            id: true,
            rating: true,
            wouldRecommend: true,
          },
        },
        savedExperts: {
          select: {
            id: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: ADMIN_USERS_PAGE_SIZE,
    }),

    prisma.user.count(),

    prisma.user.count({
      where: {
        role: "BUYER",
      },
    }),

    prisma.user.count({
      where: {
        role: "EXPERT",
      },
    }),

    prisma.user.count({
      where: {
        role: "ADMIN",
      },
    }),

    prisma.user.count({
      where: {
        role: "EXPERT",
        expertProfile: null,
      },
    }),

    prisma.user.count({
      where: {
        expertProfile: {
          isNot: null,
        },
      },
    }),
  ]);

  const shownAdmins = users.filter((user) => user.role === "ADMIN").length;
  const shownExperts = users.filter((user) => user.role === "EXPERT").length;
  const shownBuyers = users.filter((user) => user.role === "BUYER").length;
  const shownMissingProfiles = users.filter(
    (user) => user.role === "EXPERT" && !user.expertProfile,
  ).length;

  const hasActiveFilters = query || roleFilter !== "all";

  return (
    <main>
      <section className="relative overflow-hidden border-b border-[var(--border)]">
        <div className="surface-grid absolute inset-0 opacity-40" />

        <div className="relative container-page py-8 md:py-10 lg:py-14">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-sm font-black text-[var(--primary-dark)]"
          >
            <ArrowLeft size={16} />
            Back to admin
          </Link>

          {resolvedSearchParams.updated ? (
            <div className="mt-6 rounded-2xl border border-[var(--success)]/20 bg-[var(--success-soft)] p-4 text-sm font-black text-[var(--success)]">
              User updated successfully.
            </div>
          ) : null}

          {resolvedSearchParams.error ? (
            <div className="mt-6 rounded-2xl border border-[var(--danger)]/20 bg-[var(--danger-soft)] p-4 text-sm font-black text-[var(--danger)]">
              {formatUserAdminError(resolvedSearchParams.error)}
            </div>
          ) : null}

          <Badge variant="primary" className="mt-8">
            <UsersRound size={14} />
            User management
          </Badge>

          <div className="mt-6 grid gap-8 xl:grid-cols-[1fr_360px] xl:items-end">
            <div>
              <h1 className="heading-lg max-w-4xl text-balance">
                Manage SkillDrop users.
              </h1>

              <p className="mt-4 max-w-2xl text-lg leading-8 text-muted">
                View user accounts, roles, expert profiles, bookings, reviews
                and marketplace activity.
              </p>
            </div>

            <Card className="p-5">
              <Badge variant="accent">
                <ShieldCheck size={14} />
                Current view
              </Badge>

              <div className="mt-5 grid gap-3">
                <SummaryRow 
                  label="Filtered users"
                  value={String(filteredUsersCount)}
                />
                <SummaryRow label="Shown buyers" value={String(shownBuyers)} />
                <SummaryRow label="Shown experts" value={String(shownExperts)} />
                <SummaryRow label="Shown admins" value={String(shownAdmins)} />
                <SummaryRow
                  label="Missing profiles"
                  value={String(shownMissingProfiles)}
                />
              </div>
            </Card>
          </div>

          <div className="mt-8 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            <AdminMiniStat label="Total" value={String(totalUsers)} />
            <AdminMiniStat label="Buyers" value={String(buyersCount)} />
            <AdminMiniStat label="Experts" value={String(expertsCount)} />
            <AdminMiniStat label="Admins" value={String(adminsCount)} />
            <AdminMiniStat
              label="Expert profiles"
              value={String(usersWithExpertProfileCount)}
            />
            <AdminMiniStat
              label="Missing profile"
              value={String(expertsWithoutProfileCount)}
            />
          </div>

          <form action="/admin/users" className="mt-6">
            <div className="grid gap-3 rounded-[28px] border border-[var(--border)] bg-white/64 p-3 shadow-[var(--shadow-sm)] lg:grid-cols-[1fr_180px_auto_auto] lg:items-center">
              <div className="relative">
                <Search
                  size={17}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted"
                />

                <input
                  name="q"
                  type="search"
                  defaultValue={query}
                  placeholder="Search users by id, name, email, expert headline..."
                  className="input min-h-12 w-full pl-11"
                />
              </div>

              <select
                name="role"
                defaultValue={roleFilter}
                className="input min-h-12"
              >
                <option value="all">All roles</option>
                <option value="buyer">Buyers</option>
                <option value="expert">Experts</option>
                <option value="admin">Admins</option>
              </select>

              <button type="submit" className="btn btn-primary">
                Search
              </button>

              {hasActiveFilters ? (
                <Link href="/admin/users" className="btn btn-secondary">
                  Clear
                </Link>
              ) : null}
            </div>
          </form>

          <div className="mt-6 flex flex-wrap gap-2">
            <FilterLink current={roleFilter} value="all" label="All" q={query} />
            <FilterLink
              current={roleFilter}
              value="buyer"
              label="Buyers"
              q={query}
            />
            <FilterLink
              current={roleFilter}
              value="expert"
              label="Experts"
              q={query}
            />
            <FilterLink
              current={roleFilter}
              value="admin"
              label="Admins"
              q={query}
            />
          </div>
        </div>
      </section>

      <section className="container-page py-8 md:py-10 lg:py-12">
        <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <p className="text-sm font-black text-muted">
             Showing {users.length} of {filteredUsersCount} user
             {filteredUsersCount === 1 ? "" : "s"}
          </p>

          <div className="flex flex-wrap gap-2">
            <Badge>Search: {query || "none"}</Badge>
            <Badge>Role: {roleFilter}</Badge>
          </div>
        </div>

        <div className="grid gap-5">
          {users.length > 0 ? (
            users.map((user) => <UserAdminCard key={user.id} user={user} />)
          ) : (
            <Card className="p-8 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary-dark)]">
                <UsersRound size={24} />
              </div>

              <h2 className="mt-5 text-2xl font-black tracking-[-0.04em]">
                No users found
              </h2>

              <p className="mx-auto mt-3 max-w-md text-sm font-semibold leading-6 text-muted">
                Try another role filter or search query.
              </p>

              <div className="mt-5">
                <Link href="/admin/users" className="btn btn-secondary">
                  Clear filters
                </Link>
              </div>
            </Card>
          )}
        </div>
        {filteredUsersCount > ADMIN_USERS_PAGE_SIZE ? (
          <PaginationControls
            page={safePage}
            totalPages={totalPages}
            q={query}
            role={roleFilter}
          />
        ) : null}
      </section>
    </main>
  );
}

function PaginationControls({
  page,
  totalPages,
  q,
  role,
}: {
  page: number;
  totalPages: number;
  q: string;
  role: string;
}) {
  const previousPage = Math.max(page - 1, 1);
  const nextPage = Math.min(page + 1, totalPages);

  return (
    <div className="mt-6 flex flex-col items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-white/64 p-4 sm:flex-row">
      <p className="text-sm font-bold text-muted">
        Page {page} of {totalPages}
      </p>

      <div className="flex gap-2">
        {page > 1 ? (
          <Link
            href={buildAdminUsersHref({
              page: previousPage,
              q,
              role,
            })}
            className="btn btn-secondary"
          >
            Previous
          </Link>
        ) : null}

        {page < totalPages ? (
          <Link
            href={buildAdminUsersHref({
              page: nextPage,
              q,
              role,
            })}
            className="btn btn-primary"
          >
            Next
          </Link>
        ) : null}
      </div>
    </div>
  );
}

function buildAdminUsersHref({
  page,
  q,
  role,
}: {
  page: number;
  q: string;
  role: string;
}) {
  const params = new URLSearchParams();

  if (q) {
    params.set("q", q);
  }

  if (role && role !== "all") {
    params.set("role", role);
  }

  if (page > 1) {
    params.set("page", String(page));
  }

  const queryString = params.toString();

  return queryString ? `/admin/users?${queryString}` : "/admin/users";
}

function UserAdminCard({
  user,
}: {
  user: {
    id: string;
    email: string;
    name: string | null;
    role: UserRole;
    createdAt: Date;
    updatedAt: Date;
    expertProfile: {
      id: string;
      status: string;
      isVerified: boolean;
      rating: number;
      totalReviews: number;
      totalSessions: number;
      stripeAccountId: string | null;
    } | null;
    bookings: {
      id: string;
      status: string;
      priceCents: number;
      clientTotalCents: number | null;
    }[];
    reviews: {
      id: string;
      rating: number;
      wouldRecommend: boolean | null;
    }[];
    savedExperts: {
      id: string;
    }[];
  };
}) {
  const pendingBookings = user.bookings.filter(
    (booking) => booking.status === "PENDING",
  );

  const paidBookings = user.bookings.filter(
    (booking) => booking.status === "PAID",
  );

  const confirmedBookings = user.bookings.filter(
    (booking) => booking.status === "CONFIRMED",
  );

  const completedBookings = user.bookings.filter(
    (booking) => booking.status === "COMPLETED",
  );

  const disputedBookings = user.bookings.filter(
    (booking) => booking.status === "DISPUTED",
  );

  const refundedBookings = user.bookings.filter(
    (booking) => booking.status === "REFUNDED",
  );

  const completedSpendCents = completedBookings.reduce(
    (sum, booking) => sum + getBookingClientTotalCents(booking),
    0,
  );

  const activeSpendCents = user.bookings
    .filter(
      (booking) =>
        booking.status === "PAID" ||
        booking.status === "CONFIRMED" ||
        booking.status === "COMPLETED",
    )
    .reduce((sum, booking) => sum + getBookingClientTotalCents(booking), 0);

  const lowReviews = user.reviews.filter((review) => review.rating <= 2);

  const notRecommendedReviews = user.reviews.filter(
    (review) => review.wouldRecommend === false,
  );

  const expertWithoutProfile = user.role === "EXPERT" && !user.expertProfile;

  return (
    <Card className="p-5 md:p-6 hover-lift">
      <div className="grid gap-5 xl:grid-cols-[1fr_280px] xl:items-start">
        <div className="flex gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary-dark)]">
            <UserRound size={24} />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap gap-2">
              <RoleBadge role={user.role} />

              {user.expertProfile ? (
                <Badge variant="primary">Expert profile</Badge>
              ) : null}

              {user.expertProfile?.isVerified ? (
                <Badge variant="success">
                  <ShieldCheck size={14} />
                  Verified expert
                </Badge>
              ) : null}

              {user.expertProfile?.stripeAccountId ? (
                <Badge variant="success">
                  <Euro size={14} />
                  Payout ready
                </Badge>
              ) : null}

              {expertWithoutProfile ? (
                <Badge variant="danger">
                  <ShieldAlert size={14} />
                  Missing expert profile
                </Badge>
              ) : null}
            </div>

            <h2 className="mt-4 text-2xl font-black tracking-[-0.04em]">
              {user.name ?? user.email}
            </h2>

            <p className="mt-2 break-all text-sm font-semibold leading-6 text-muted">
              {user.email}
            </p>

            <p className="mt-1 break-all text-xs font-bold text-muted">
              ID: {user.id}
            </p>

            {expertWithoutProfile ? (
              <div className="mt-4 rounded-2xl border border-[var(--danger)]/20 bg-[var(--danger-soft)] p-3 text-sm font-black leading-6 text-[var(--danger)]">
                This user has EXPERT role but no expert profile. They may need
                to complete onboarding or be changed back to buyer.
              </div>
            ) : null}

            <div className="mt-4 grid gap-2 md:grid-cols-4">
              <SmallFact label="Bookings" value={String(user.bookings.length)} />
              <SmallFact label="Pending" value={String(pendingBookings.length)} />
              <SmallFact label="Paid" value={String(paidBookings.length)} />
              <SmallFact label="Confirmed" value={String(confirmedBookings.length)} />
            </div>

            <div className="mt-4 grid gap-2 md:grid-cols-4">
              <SmallFact label="Completed" value={String(completedBookings.length)} />
              <SmallFact label="Disputed" value={String(disputedBookings.length)} />
              <SmallFact label="Refunded" value={String(refundedBookings.length)} />
              <SmallFact label="Saved" value={String(user.savedExperts.length)} />
            </div>

            <div className="mt-4 grid gap-2 md:grid-cols-4">
              <SmallFact label="Active spend" value={formatMoney(activeSpendCents)} />
              <SmallFact
                label="Completed spend"
                value={formatMoney(completedSpendCents)}
              />
              <SmallFact label="Reviews" value={String(user.reviews.length)} />
              <SmallFact
                label="Bad reviews"
                value={String(lowReviews.length + notRecommendedReviews.length)}
              />
            </div>

            <div className="mt-4 grid gap-2 md:grid-cols-4">
              <SmallFact label="Created" value={formatShortDate(user.createdAt)} />
              <SmallFact label="Updated" value={formatShortDate(user.updatedAt)} />

              {user.expertProfile ? (
                <>
                  <SmallFact
                    label="Expert status"
                    value={user.expertProfile.status.toLowerCase()}
                  />
                  <SmallFact
                    label="Expert rating"
                    value={
                      user.expertProfile.rating
                        ? `${user.expertProfile.rating.toFixed(1)}/5`
                        : "New"
                    }
                  />
                </>
              ) : (
                <>
                  <SmallFact label="Expert status" value="—" />
                  <SmallFact label="Expert rating" value="—" />
                </>
              )}
            </div>

            {user.expertProfile ? (
              <div className="mt-4 grid gap-2 md:grid-cols-3">
                <SmallFact
                  label="Expert reviews"
                  value={String(user.expertProfile.totalReviews)}
                />
                <SmallFact
                  label="Expert sessions"
                  value={String(user.expertProfile.totalSessions)}
                />
                <SmallFact
                  label="Payout"
                  value={user.expertProfile.stripeAccountId ? "ready" : "missing"}
                />
              </div>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-2">
              {user.expertProfile ? (
                <Link
                  href={`/experts/${user.expertProfile.id}`}
                  className="btn btn-secondary"
                >
                  View expert profile
                </Link>
              ) : null}

              <Link
                href={`/admin/bookings?q=${encodeURIComponent(user.email)}`}
                className="btn btn-secondary"
              >
                User bookings
              </Link>

              <Link
                href={`/admin/reviews?q=${encodeURIComponent(user.email)}`}
                className="btn btn-secondary"
              >
                User reviews
              </Link>

              {user.expertProfile ? (
                <Link
                  href={`/admin/experts?q=${encodeURIComponent(user.email)}`}
                  className="btn btn-secondary"
                >
                  Manage expert
                </Link>
              ) : null}
            </div>
          </div>
        </div>

        <div className="grid gap-3 rounded-[24px] border border-[var(--border)] bg-white/64 p-4">
          <p className="text-sm font-black tracking-[-0.02em]">
            Change role
          </p>

          <p className="text-xs font-bold leading-5 text-muted">
            Be careful with admin access. Your server action protects your own
            admin role from being removed.
          </p>

          {user.role !== "BUYER" ? (
            <RoleForm userId={user.id} role="BUYER" label="Make buyer" />
          ) : null}

          {user.role !== "EXPERT" ? (
            <RoleForm userId={user.id} role="EXPERT" label="Make expert" />
          ) : null}

          {user.role !== "ADMIN" ? (
            <RoleForm userId={user.id} role="ADMIN" label="Make admin" />
          ) : null}

          <div className="rounded-2xl border border-[var(--border)] bg-white/64 p-3">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">
              Current role
            </p>
            <p className="mt-1 text-sm font-black">{user.role}</p>
          </div>
        </div>
      </div>
    </Card>
  );
}

function RoleForm({
  userId,
  role,
  label,
}: {
  userId: string;
  role: UserRole;
  label: string;
}) {
  return (
    <form action={updateUserRoleByAdminAction}>
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="role" value={role} />

      <button type="submit" className="btn btn-secondary w-full">
        {label}
      </button>
    </form>
  );
}

function RoleBadge({ role }: { role: UserRole }) {
  if (role === "ADMIN") {
    return (
      <Badge variant="success">
        <Crown size={14} />
        Admin
      </Badge>
    );
  }

  if (role === "EXPERT") {
    return (
      <Badge variant="primary">
        <BriefcaseBusiness size={14} />
        Expert
      </Badge>
    );
  }

  return (
    <Badge variant="accent">
      <UserRound size={14} />
      Buyer
    </Badge>
  );
}

function FilterLink({
  current,
  value,
  label,
  q,
}: {
  current: string;
  value: string;
  label: string;
  q: string;
}) {
  const isActive = current === value;

  const params = new URLSearchParams();

  if (value !== "all") {
    params.set("role", value);
  }

  if (q) {
    params.set("q", q);
  }

  const href = params.toString()
    ? `/admin/users?${params.toString()}`
    : "/admin/users";

  return (
    <Link
      href={href}
      className={
        isActive
          ? "rounded-full bg-[var(--foreground)] px-4 py-2 text-sm font-black text-[var(--background)]"
          : "hover-scale rounded-full border border-[var(--border)] bg-white/64 px-4 py-2 text-sm font-black text-[var(--muted-foreground)] hover:bg-white hover:text-[var(--primary-dark)]"
      }
    >
      {label}
    </Link>
  );
}

function AdminMiniStat({ label, value }: { label: string; value: string }) {
  return (
    <Card soft className="p-4 hover-lift">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
        {label}
      </p>
      <p className="mt-2 text-2xl font-black tracking-[-0.04em]">{value}</p>
    </Card>
  );
}

function SmallFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-white/64 p-3">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">
        {label}
      </p>
      <p className="mt-1 line-clamp-2 break-words text-sm font-black" title={value}>
        {value}
      </p>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-white/64 p-3">
      <p className="text-sm font-bold text-muted">{label}</p>
      <p className="text-sm font-black">{value}</p>
    </div>
  );
}

function getBookingClientTotalCents(booking: {
  priceCents: number;
  clientTotalCents: number | null;
}) {
  if (typeof booking.clientTotalCents === "number") {
    return booking.clientTotalCents;
  }

  return booking.priceCents;
}

function formatUserAdminError(error: string) {
  if (error === "invalid-role") {
    return "Invalid role selected.";
  }

  if (error === "user-not-found") {
    return "User was not found.";
  }

  if (error === "cannot-change-own-admin-role") {
    return "You cannot remove your own admin role.";
  }

  return "Something went wrong while updating this user.";
}

function formatMoney(cents: number) {
  return `€${(cents / 100).toFixed(2).replace(".00", "")}`;
}

function formatShortDate(date: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}