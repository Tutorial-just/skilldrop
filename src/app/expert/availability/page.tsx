import Link from "next/link";
import { redirect } from "next/navigation";
import { BookingStatus } from "@prisma/client";
import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Globe2,
  Layers3,
  Plus,
  Repeat,
  ShieldCheck,
  Trash2,
  Video,
} from "lucide-react";

import { formatDateTime, getDurationMinutes } from "@/lib/date-time";
import {
  createAvailabilityAction,
  createBulkAvailabilityAction,
  deleteAvailabilityAction,
  deletePastOpenAvailabilityAction,
} from "@/server/actions/availability.actions";
import { requireRole } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type ExpertAvailabilityPageProps = {
  searchParams?: Promise<{
    error?: string;
    saved?: string;
    deleted?: string;
    created?: string;
    skipped?: string;
    view?: string;
  }>;
};

type AvailabilityView = "all" | "open" | "booked" | "today" | "week" | "past";

type AvailabilityWindowWithDetails = {
  id: string;
  startTime: Date;
  endTime: Date;
  isActive: boolean;
  bookings: {
    id: string;
    startTime: Date;
    endTime: Date;
    status: BookingStatus;
    service: {
      title: string;
    } | null;
    buyer: {
      name: string | null;
      email: string;
    };
  }[];
};

const durationOptions = [15, 30, 45, 60];
const breakOptions = [0, 5, 10, 15, 30];
const repeatWeekOptions = [1, 2, 3, 4, 6, 8];
const MAX_VISIBLE_WINDOWS = 60;
const MAX_LOADED_WINDOWS = 140;
const PAST_WINDOW_DAYS = 30;
const FUTURE_WINDOW_DAYS = 180;

const activeBookingStatuses: BookingStatus[] = [
  BookingStatus.PENDING,
  BookingStatus.PAID,
  BookingStatus.CONFIRMED,
  BookingStatus.DISPUTED,
];

const viewTabs: {
  label: string;
  value: AvailabilityView;
}[] = [
  { label: "All", value: "all" },
  { label: "Open", value: "open" },
  { label: "Booked", value: "booked" },
  { label: "Today", value: "today" },
  { label: "This week", value: "week" },
  { label: "Past", value: "past" },
];

const weekdays = [
  { label: "Mon", value: "1" },
  { label: "Tue", value: "2" },
  { label: "Wed", value: "3" },
  { label: "Thu", value: "4" },
  { label: "Fri", value: "5" },
  { label: "Sat", value: "6" },
  { label: "Sun", value: "0" },
];

export default async function ExpertAvailabilityPage({
  searchParams,
}: ExpertAvailabilityPageProps) {
  const { user } = await requireRole(["expert", "admin"]);
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const currentView = getValidView(resolvedSearchParams.view);

  const now = new Date();

  const pastWindowLimitDate = new Date(now);
  pastWindowLimitDate.setDate(pastWindowLimitDate.getDate() - PAST_WINDOW_DAYS);
  pastWindowLimitDate.setHours(0, 0, 0, 0);

  const futureWindowLimitDate = new Date(now);
  futureWindowLimitDate.setDate(
    futureWindowLimitDate.getDate() + FUTURE_WINDOW_DAYS,
  );
  futureWindowLimitDate.setHours(23, 59, 59, 999);

  const expert = await prisma.expertProfile.findUnique({
    where: {
      userId: user.id,
    },
    include: {
      services: {
        where: {
          isActive: true,
        },
        select: {
          id: true,
          title: true,
          durationMinutes: true,
        },
        orderBy: {
          durationMinutes: "asc",
        },
      },
      availability: {
        where: {
          OR: [
            {
              isActive: true,
              endTime: {
                gte: now,
              },
              startTime: {
                lte: futureWindowLimitDate,
              },
            },
            {
              startTime: {
                gte: pastWindowLimitDate,
              },
              endTime: {
                lt: now,
              },
            },
          ],
        },
        include: {
          bookings: {
            where: {
              status: {
                in: activeBookingStatuses,
              },
            },
            include: {
              service: true,
              buyer: true,
            },
            orderBy: {
              startTime: "asc",
            },
          },
        },
        orderBy: {
          startTime: "asc",
        },
        take: MAX_LOADED_WINDOWS,
      },
      bookings: {
        where: {
          startTime: {
            gte: now,
          },
          status: {
            in: activeBookingStatuses,
          },
        },
        include: {
          service: {
            select: {
              title: true,
            },
          },
          buyer: {
            select: {
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          startTime: "asc",
        },
        take: 3,
      },
    },
  });

  if (!expert) {
    redirect("/become-expert");
  }

  const upcomingWindows = expert.availability.filter(
    (window) => window.endTime >= now && window.isActive,
  );

  const openWindows = upcomingWindows.filter(
    (window) => getWindowFreeMinutes(window) > 0,
  );

  const bookedWindows = upcomingWindows.filter(
    (window) => window.bookings.length > 0,
  );

  const pastWindows = expert.availability.filter(
    (window) => window.endTime < now,
  );

  const pastOpenWindows = pastWindows.filter(
    (window) => window.bookings.length === 0,
  );

  const filteredWindows = filterWindowsByView({
    windows: expert.availability,
    view: currentView,
    now,
  });

  const visibleWindows = filteredWindows.slice(0, MAX_VISIBLE_WINDOWS);
  const hiddenWindowsCount = Math.max(
    filteredWindows.length - visibleWindows.length,
    0,
  );

  const groupedWindows = groupWindowsByDate(visibleWindows);

  const minDateTime = toDateTimeLocalValue(now);
  const minDate = toDateValue(now);

  const createdCount = resolvedSearchParams.created
    ? Number(resolvedSearchParams.created)
    : null;

  const skippedCount = resolvedSearchParams.skipped
    ? Number(resolvedSearchParams.skipped)
    : null;

  const deletedCount = resolvedSearchParams.deleted
    ? Number(resolvedSearchParams.deleted)
    : null;

  const shortestActiveService = expert.services[0] ?? null;
  const shortestServiceDuration = shortestActiveService?.durationMinutes ?? null;

  const availableDurationOptions = shortestServiceDuration
    ? durationOptions.filter((duration) => duration >= shortestServiceDuration)
    : durationOptions;

  const defaultBulkDuration = String(shortestServiceDuration ?? 60);

  const isPaymentReady =
    Boolean(expert.stripeAccountId) &&
    expert.stripeChargesEnabled &&
    expert.stripePayoutsEnabled &&
    expert.stripeDetailsSubmitted;

  const isReadyForBookings =
    expert.services.length > 0 && openWindows.length > 0 && isPaymentReady;

  return (
    <main>
      <section className="relative overflow-hidden border-b border-[var(--border)]">
        <div className="surface-grid absolute inset-0 opacity-40" />
        <div className="absolute left-[-160px] top-[-180px] h-[420px] w-[420px] rounded-full bg-[var(--primary)]/10 blur-3xl" />
        <div className="absolute bottom-[-220px] right-[-160px] h-[420px] w-[420px] rounded-full bg-[var(--accent)]/10 blur-3xl" />

        <div className="relative p-6 md:p-8 lg:p-10">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <Link
                href="/expert"
                className="inline-flex items-center gap-2 text-sm font-bold text-[var(--primary-dark)]"
              >
                <ArrowLeft size={16} />
                Back to dashboard
              </Link>

              {resolvedSearchParams.saved ? (
                <div className="mt-6 rounded-2xl border border-[var(--success)]/20 bg-[var(--success-soft)] p-4 text-sm font-bold text-[var(--success)]">
                  {createdCount && createdCount > 0
                    ? `${createdCount} availability window${
                        createdCount === 1 ? "" : "s"
                      } created.${
                        skippedCount && skippedCount > 0
                          ? ` ${skippedCount} overlapping window${
                              skippedCount === 1 ? "" : "s"
                            } skipped.`
                          : ""
                      }`
                    : "Availability window added. Buyers can now book time inside it."}
                </div>
              ) : null}

              {resolvedSearchParams.deleted ? (
                <div className="mt-6 rounded-2xl border border-[var(--success)]/20 bg-[var(--success-soft)] p-4 text-sm font-bold text-[var(--success)]">
                  {deletedCount && deletedCount > 1
                    ? `${deletedCount} old availability windows removed.`
                    : "Availability window removed."}
                </div>
              ) : null}

              {resolvedSearchParams.error ? (
                <div className="mt-6 rounded-2xl border border-[var(--danger)]/20 bg-[var(--danger-soft)] p-4 text-sm font-bold text-[var(--danger)]">
                  {formatAvailabilityError(resolvedSearchParams.error)}
                </div>
              ) : null}

              <div className="mt-6 flex flex-wrap gap-2">
                <Badge variant="primary">
                  <CalendarDays size={14} />
                  Availability
                </Badge>

                <Badge variant={isReadyForBookings ? "success" : "accent"}>
                  {isReadyForBookings ? (
                    <>
                      <CheckCircle2 size={14} />
                      Bookable
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={14} />
                      Setup needed
                    </>
                  )}
                </Badge>

                <Badge variant="accent">
                  <Globe2 size={14} />
                  Timezone-aware scheduling
                </Badge>
              </div>

              <h1 className="heading-lg mt-5 max-w-4xl text-balance">
                Manage your bookable time windows.
              </h1>

              <p className="mt-4 max-w-2xl text-lg leading-8 text-[var(--muted-foreground)]">
                Add time windows when you are available. Buyers will be able to
                choose a short 1:1 call inside those windows based on your
                offers.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <ButtonLink href="/expert/services">
                Manage offers
                <ArrowRight size={18} />
              </ButtonLink>

              <ButtonLink href="/expert/bookings" variant="secondary">
                View bookings
              </ButtonLink>
            </div>
          </div>

          <div className="mt-8 grid gap-3 md:grid-cols-4">
            <MiniStat label="Open windows" value={String(openWindows.length)} />
            <MiniStat label="With bookings" value={String(bookedWindows.length)} />
            <MiniStat label="Past" value={String(pastWindows.length)} />
            <MiniStat label="Total" value={String(expert.availability.length)} />
          </div>
        </div>
      </section>

      <section className="p-6 md:p-8 lg:p-10">
        <div className="grid gap-5">
          <Card
            className={
              shortestServiceDuration
                ? "border-[var(--warning)]/20 bg-[var(--warning-soft)] p-5"
                : "border-[var(--danger)]/20 bg-[var(--danger-soft)] p-5"
            }
          >
            <Badge variant={shortestServiceDuration ? "accent" : "danger"}>
              <Clock3 size={14} />
              Window duration rule
            </Badge>

            {shortestServiceDuration ? (
              <>
                <h2 className="mt-4 text-2xl font-black tracking-[-0.04em]">
                  Create windows long enough for your current offers.
                </h2>

                <p className="mt-2 text-sm font-bold leading-6 text-[var(--muted-foreground)]">
                  Your shortest active offer is{" "}
                  <span className="font-bold text-[var(--foreground)]">
                    {shortestServiceDuration} minutes
                  </span>
                  . A buyer can only book inside a window if there is enough
                  free time for the selected call duration.
                </p>

                <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] p-4 text-sm font-bold leading-6 text-[var(--muted-foreground)]">
                  Example: if you create a 10:00–14:00 window, buyers can book
                  15, 30, 45 or 60 minute calls inside it, as long as the time is
                  still free.
                </div>

                <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] p-4 text-sm font-bold leading-6 text-[var(--muted-foreground)]">
                  Shortest offer:{" "}
                  <span className="font-bold text-[var(--foreground)]">
                    {shortestActiveService?.title}
                  </span>{" "}
                  · {shortestServiceDuration} min
                </div>
              </>
            ) : (
              <>
                <h2 className="mt-4 text-2xl font-black tracking-[-0.04em]">
                  Create an active offer first.
                </h2>

                <p className="mt-2 text-sm font-bold leading-6 text-[var(--muted-foreground)]">
                  Availability works together with your offers. Add at least one
                  active offer before creating time windows.
                </p>

                <div className="mt-4">
                  <ButtonLink href="/expert/services">
                    Create offer
                    <ArrowRight size={18} />
                  </ButtonLink>
                </div>
              </>
            )}
          </Card>

          <Card className="border-[var(--primary)]/20 bg-[var(--primary-soft)] p-5">
            <Badge variant="primary">
              <Video size={14} />
              How buyers book inside your window
            </Badge>

            <h2 className="mt-4 text-2xl font-black tracking-[-0.04em]">
              You create open windows. Buyers choose exact call times inside them.
            </h2>

            <p className="mt-2 text-sm font-bold leading-6 text-[var(--muted-foreground)]">
              Example: if you open 18:00–22:00 and your offer is 30 minutes, a
              buyer can book one available 30 minute slot inside that window.
              Keep windows fresh every week so your profile stays bookable.
            </p>
          </Card>

          <Card className="border-[var(--primary)]/15 bg-[var(--primary-soft)] p-5">
            <Badge variant="primary">
              <Globe2 size={14} />
              Global scheduling note
            </Badge>

            <h2 className="mt-4 text-2xl font-black tracking-[-0.04em]">
              Your times are automatically adapted for each buyer.
            </h2>

            <p className="mt-2 text-sm font-bold leading-6 text-[var(--primary-dark)]/80">
              Add availability in your local time. SkillDrop stores the time
              safely and shows each buyer the equivalent time in their own
              timezone.
            </p>
          </Card>

          <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr] xl:items-start">
            <details className="self-start rounded-[26px] border border-[var(--border)] bg-[var(--card)] p-4 shadow-[var(--shadow-sm)] backdrop-blur">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-[20px]">
                <div className="flex items-center gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary-dark)]">
                    <Plus size={20} />
                  </div>

                  <div>
                    <p className="font-bold tracking-[-0.02em]">
                      Add available window
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[var(--muted-foreground)]">
                      Add one bookable time window.
                    </p>
                  </div>
                </div>

                <div className="btn btn-primary hidden sm:inline-flex">
                  Add window
                  <ArrowRight size={17} />
                </div>
              </summary>

              <div className="mt-4 border-t border-[var(--border)] pt-4">
                <form
                  action={createAvailabilityAction}
                  className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end"
                >
                  <div>
                    <label htmlFor="startTime" className="text-sm font-bold">
                      Start time
                    </label>

                    <input
                      id="startTime"
                      name="startTime"
                      type="datetime-local"
                      min={minDateTime}
                      required
                      className="input mt-2"
                    />

                    <p className="mt-2 text-xs font-bold leading-5 text-[var(--muted-foreground)]">
                      Example: 15:00.
                    </p>
                  </div>

                  <div>
                    <label htmlFor="endTime" className="text-sm font-bold">
                      End time
                    </label>

                    <input
                      id="endTime"
                      name="endTime"
                      type="datetime-local"
                      min={minDateTime}
                      required
                      className="input mt-2"
                    />

                    {shortestServiceDuration ? (
                      <p className="mt-2 text-xs font-bold leading-5 text-[var(--muted-foreground)]">
                        Must fit at least {shortestServiceDuration} min.
                      </p>
                    ) : null}
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={!shortestServiceDuration}
                  >
                    Add
                    <ArrowRight size={18} />
                  </button>
                </form>
              </div>
            </details>

            <details className="self-start rounded-[26px] border border-[var(--border)] bg-[var(--card)] p-4 shadow-[var(--shadow-sm)] backdrop-blur">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
                    <Repeat size={20} />
                  </div>

                  <div>
                    <p className="font-bold tracking-[-0.02em]">
                      Bulk create windows
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[var(--muted-foreground)]">
                      Create repeated weekly availability windows.
                    </p>
                  </div>
                </div>

                <Badge variant="accent">Weekly</Badge>
              </summary>

              <div className="mt-4 border-t border-[var(--border)] pt-4">
                <form action={createBulkAvailabilityAction} className="grid gap-5">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <label htmlFor="startDate" className="text-sm font-bold">
                        Start date
                      </label>

                      <input
                        id="startDate"
                        name="startDate"
                        type="date"
                        min={minDate}
                        required
                        className="input mt-2"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="bulkStartTime"
                        className="text-sm font-bold"
                      >
                        From
                      </label>

                      <input
                        id="bulkStartTime"
                        name="startTime"
                        type="time"
                        required
                        defaultValue="10:00"
                        className="input mt-2"
                      />
                    </div>

                    <div>
                      <label htmlFor="bulkEndTime" className="text-sm font-bold">
                        To
                      </label>

                      <input
                        id="bulkEndTime"
                        name="endTime"
                        type="time"
                        required
                        defaultValue="14:00"
                        className="input mt-2"
                      />
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-bold">Weekdays</p>

                    <div className="mt-2 flex flex-wrap gap-2">
                      {weekdays.map((day) => (
                        <label
                          key={day.value}
                          className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--card-soft)] px-4 py-2 text-sm font-bold text-[var(--muted-foreground)] transition hover:border-[var(--border-strong)] hover:bg-[var(--primary-soft)] hover:text-[var(--primary-dark)]"
                        >
                          <input
                            type="checkbox"
                            name="weekdays"
                            value={day.value}
                            defaultChecked={
                              day.value !== "0" && day.value !== "6"
                            }
                          />
                          {day.label}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <label
                        htmlFor="bulkDurationMinutes"
                        className="text-sm font-bold"
                      >
                        Minimum call length
                      </label>

                      <select
                        id="bulkDurationMinutes"
                        name="durationMinutes"
                        required
                        defaultValue={defaultBulkDuration}
                        className="input mt-2"
                      >
                        {availableDurationOptions.map((duration) => (
                          <option key={duration} value={duration}>
                            {duration} min
                          </option>
                        ))}
                      </select>

                      {shortestServiceDuration ? (
                        <p className="mt-2 text-xs font-bold leading-5 text-[var(--muted-foreground)]">
                          Window must fit at least {shortestServiceDuration} min.
                        </p>
                      ) : null}
                    </div>

                    <div>
                      <label
                        htmlFor="breakMinutes"
                        className="text-sm font-bold"
                      >
                        Break between calls
                      </label>

                      <select
                        id="breakMinutes"
                        name="breakMinutes"
                        required
                        defaultValue="10"
                        className="input mt-2"
                      >
                        {breakOptions.map((breakMinutes) => (
                          <option key={breakMinutes} value={breakMinutes}>
                            {breakMinutes} min
                          </option>
                        ))}
                      </select>

                      <p className="mt-2 text-xs font-bold leading-5 text-[var(--muted-foreground)]">
                        Used later when generating buyer start times.
                      </p>
                    </div>

                    <div>
                      <label htmlFor="repeatWeeks" className="text-sm font-bold">
                        Repeat
                      </label>

                      <select
                        id="repeatWeeks"
                        name="repeatWeeks"
                        required
                        defaultValue="2"
                        className="input mt-2"
                      >
                        {repeatWeekOptions.map((weeks) => (
                          <option key={weeks} value={weeks}>
                            {weeks} week{weeks === 1 ? "" : "s"}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] p-4">
                    <p className="text-sm font-bold leading-6 text-[var(--muted-foreground)]">
                      Existing overlapping windows will be skipped automatically.
                      Each selected day creates one availability window.
                    </p>
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary w-full"
                    disabled={!shortestServiceDuration}
                  >
                    Create weekly windows
                    <ArrowRight size={18} />
                  </button>
                </form>
              </div>
            </details>
          </div>

          <Card className="p-5 md:p-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <Badge variant="primary">
                  <Layers3 size={14} />
                  Availability calendar
                </Badge>

                <h2 className="mt-4 text-3xl font-black tracking-[-0.05em]">
                  Time windows
                </h2>

                <p className="mt-2 max-w-2xl leading-7 text-[var(--muted-foreground)]">
                  Showing {visibleWindows.length} of {filteredWindows.length}{" "}
                  windows. Keep your open schedule fresh so buyers can book
                  quickly.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {pastOpenWindows.length > 0 ? (
                  <form action={deletePastOpenAvailabilityAction}>
                    <button type="submit" className="btn btn-secondary">
                      Clean past windows
                      <Trash2 size={17} />
                    </button>
                  </form>
                ) : null}

                {hiddenWindowsCount > 0 ? (
                  <Badge variant="accent">
                    +{hiddenWindowsCount} more hidden
                  </Badge>
                ) : null}
              </div>
            </div>

            <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
              {viewTabs.map((tab) => (
                <Link
                  key={tab.value}
                  href={`/expert/availability?view=${tab.value}`}
                  className={
                    currentView === tab.value
                      ? "flex shrink-0 items-center rounded-full border border-[var(--primary)] bg-[var(--primary)] px-4 py-2 text-xs font-bold text-white shadow-[0_10px_24px_rgba(139,92,246,0.22)]"
                      : "flex shrink-0 items-center rounded-full border border-[var(--border)] bg-[var(--card-soft)] px-4 py-2 text-xs font-bold text-[var(--muted-foreground)] transition hover:border-[var(--border-strong)] hover:bg-[var(--primary-soft)] hover:text-[var(--primary-dark)]"
                  }
                >
                  {tab.label}
                </Link>
              ))}
            </div>

            <div className="mt-6 grid gap-4">
              {groupedWindows.length > 0 ? (
                groupedWindows.map((group) => (
                  <details
                    key={group.label}
                    open
                    className="rounded-[22px] border border-[var(--border)] bg-[var(--card-soft)] p-4"
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-bold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                          {group.label}
                        </p>

                        <p className="mt-1 text-xs font-bold text-[var(--muted-foreground)]">
                          {group.openCount} open · {group.bookedCount} with
                          bookings
                        </p>
                      </div>

                      <Badge>{group.windows.length} windows</Badge>
                    </summary>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {group.windows.map((window) => (
                        <WindowChip key={window.id} window={window} />
                      ))}
                    </div>
                  </details>
                ))
              ) : (
                <EmptyState view={currentView} />
              )}
            </div>
          </Card>

          <div className="grid gap-4 lg:grid-cols-[1fr_0.75fr]">
            <Card className="p-5">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <Badge variant="accent">
                    <Video size={14} />
                    Upcoming calls
                  </Badge>

                  <h2 className="mt-4 text-2xl font-black tracking-[-0.04em]">
                    Next bookings
                  </h2>
                </div>

                <ButtonLink href="/expert/bookings" variant="secondary">
                  View all
                </ButtonLink>
              </div>

              <div className="mt-5 grid gap-3">
                {expert.bookings.length > 0 ? (
                  expert.bookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-bold">
                            {booking.service?.title ?? "1:1 call"}
                          </p>

                          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                            {booking.buyer.name ?? booking.buyer.email}
                          </p>
                        </div>

                        <Badge>{formatStatus(booking.status)}</Badge>
                      </div>

                      <p className="mt-3 text-sm font-bold text-[var(--primary-dark)]">
                        {formatDateTime(booking.startTime)}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[22px] border border-dashed border-[var(--border-strong)] bg-[var(--card-soft)] p-5">
                    <p className="font-bold">No upcoming bookings</p>
                    <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                      Buyer bookings will appear here after someone reserves
                      time inside your availability windows.
                    </p>
                  </div>
                )}
              </div>
            </Card>

            <Card soft className="p-5">
              <Badge variant="primary">
                <CalendarClock size={14} />
                Calendar tips
              </Badge>

              <div className="mt-5 grid gap-3">
                <CompactTip text="Keep 7–14 days of availability windows visible." />
                <CompactTip text="Use bulk create to prepare your week faster." />
                <CompactTip text="Delete old windows to keep the calendar clean." />
                <CompactTip text="Create windows that are long enough for your current offers." />
                <CompactTip text="Flexible calls let buyers choose 15–60 minutes inside available windows." />
              </div>
            </Card>
          </div>
        </div>
      </section>
    </main>
  );
}

function WindowChip({
  window,
}: {
  window: AvailabilityWindowWithDetails;
}) {
  const isPast = window.endTime < new Date();
  const hasBookings = window.bookings.length > 0;
  const freeMinutes = getWindowFreeMinutes(window);
  const totalMinutes = getDurationMinutes(window.startTime, window.endTime);

  const chipClassName = hasBookings
    ? "group inline-flex min-h-10 flex-wrap items-center gap-2 rounded-2xl border border-[var(--success)]/20 bg-[var(--success-soft)] px-3 py-2 text-sm font-bold text-[var(--success)]"
    : isPast
      ? "group inline-flex min-h-10 items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] px-3 py-2 text-sm font-bold text-[var(--muted-foreground)]"
      : "group inline-flex min-h-10 items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--background-soft)] px-3 py-2 text-sm font-bold text-[var(--foreground)] shadow-sm transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-sm)]";

  return (
    <div
      className={chipClassName}
      title={`${formatTime(window.startTime)} — ${formatTime(window.endTime)}`}
    >
      <Clock3 size={14} />

      <span>
        {formatTime(window.startTime)}–{formatTime(window.endTime)}
      </span>

      <span className="rounded-full bg-[var(--card-soft)] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em]">
        {totalMinutes} min
      </span>

      {hasBookings ? (
        <span className="rounded-full bg-[var(--card-soft)] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em]">
          {window.bookings.length} booking
          {window.bookings.length === 1 ? "" : "s"}
        </span>
      ) : isPast ? (
        <span className="rounded-full bg-[var(--card-soft)] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em]">
          Past
        </span>
      ) : (
        <>
          <span className="rounded-full bg-[var(--primary-soft)] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--primary-dark)]">
            {freeMinutes} min free
          </span>

          <form action={deleteAvailabilityAction}>
            <input type="hidden" name="slotId" value={window.id} />

            <button
              type="submit"
              className="ml-1 flex h-7 w-7 items-center justify-center rounded-full text-[var(--muted-foreground)] transition hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]"
              aria-label="Delete window"
              title="Delete window"
            >
              <Trash2 size={13} />
            </button>
          </form>
        </>
      )}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <Card soft className="p-4">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
        {label}
      </p>

      <p className="mt-2 text-2xl font-bold tracking-[-0.04em] text-[var(--foreground)]">
        {value}
      </p>
    </Card>
  );
}

function CompactTip({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] p-4">
      <p className="text-sm font-medium leading-6 text-[var(--muted-foreground)]">
        {text}
      </p>
    </div>
  );
}

function EmptyState({ view }: { view: AvailabilityView }) {
  return (
    <div className="rounded-[24px] border border-dashed border-[var(--border-strong)] bg-[var(--card-soft)] p-7 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary-dark)]">
        <CalendarDays size={22} />
      </div>

      <h3 className="mt-4 text-2xl font-bold tracking-[-0.04em] text-[var(--foreground)]">
        No windows found
      </h3>

      <p className="mx-auto mt-3 max-w-md leading-7 text-[var(--muted-foreground)]">
        There are no availability windows for the “{view}” filter. Add
        availability or choose another filter.
      </p>
    </div>
  );
}

function getValidView(value: string | undefined): AvailabilityView {
  if (
    value === "open" ||
    value === "booked" ||
    value === "today" ||
    value === "week" ||
    value === "past"
  ) {
    return value;
  }

  return "all";
}

function filterWindowsByView({
  windows,
  view,
  now,
}: {
  windows: AvailabilityWindowWithDetails[];
  view: AvailabilityView;
  now: Date;
}) {
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  const weekEnd = new Date(now);
  weekEnd.setDate(weekEnd.getDate() + 7);
  weekEnd.setHours(23, 59, 59, 999);

  if (view === "open") {
    return windows.filter(
      (window) =>
        window.isActive &&
        window.endTime >= now &&
        getWindowFreeMinutes(window) > 0,
    );
  }

  if (view === "booked") {
    return windows.filter(
      (window) =>
        window.isActive && window.endTime >= now && window.bookings.length > 0,
    );
  }

  if (view === "today") {
    return windows.filter(
      (window) =>
        window.startTime >= todayStart &&
        window.startTime <= todayEnd &&
        window.isActive,
    );
  }

  if (view === "week") {
    return windows.filter(
      (window) =>
        window.endTime >= now && window.startTime <= weekEnd && window.isActive,
    );
  }

  if (view === "past") {
    return windows
      .filter((window) => window.endTime < now)
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
  }

  return windows.filter((window) => window.endTime >= now && window.isActive);
}

function groupWindowsByDate(windows: AvailabilityWindowWithDetails[]) {
  const groups = new Map<
    string,
    {
      label: string;
      openCount: number;
      bookedCount: number;
      windows: AvailabilityWindowWithDetails[];
    }
  >();

  windows.forEach((window) => {
    const label = new Intl.DateTimeFormat("en", {
      weekday: "long",
      month: "short",
      day: "numeric",
    }).format(window.startTime);

    const hasBookings = window.bookings.length > 0;
    const hasFreeTime = getWindowFreeMinutes(window) > 0;

    const existing = groups.get(label);

    if (existing) {
      existing.windows.push(window);

      if (hasFreeTime) {
        existing.openCount += 1;
      }

      if (hasBookings) {
        existing.bookedCount += 1;
      }

      return;
    }

    groups.set(label, {
      label,
      openCount: hasFreeTime ? 1 : 0,
      bookedCount: hasBookings ? 1 : 0,
      windows: [window],
    });
  });

  return Array.from(groups.values());
}

function getWindowFreeMinutes(window: {
  startTime: Date;
  endTime: Date;
  bookings: {
    startTime: Date;
    endTime: Date;
    status: BookingStatus;
  }[];
}) {
  const totalMinutes = getDurationMinutes(window.startTime, window.endTime);

  const bookedMinutes = window.bookings
    .filter((booking) => activeBookingStatuses.includes(booking.status))
    .reduce(
      (sum, booking) =>
        sum + Math.max(getDurationMinutes(booking.startTime, booking.endTime), 0),
      0,
    );

  return Math.max(totalMinutes - bookedMinutes, 0);
}

function toDateTimeLocalValue(date: Date) {
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  const localDate = new Date(date.getTime() - offsetMs);

  return localDate.toISOString().slice(0, 16);
}

function toDateValue(date: Date) {
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  const localDate = new Date(date.getTime() - offsetMs);

  return localDate.toISOString().slice(0, 10);
}

function formatStatus(status: string) {
  if (status === "PENDING") {
    return "Pending payment";
  }

  if (status === "PAID") {
    return "Confirming";
  }

  if (status === "CONFIRMED") {
    return "Confirmed";
  }

  if (status === "COMPLETED") {
    return "Completed";
  }

  if (status === "CANCELLED") {
    return "Cancelled";
  }

  if (status === "REFUNDED") {
    return "Refunded";
  }

  if (status === "DISPUTED") {
    return "Disputed";
  }

  if (status === "EXPIRED") {
    return "Expired";
  }

  return status.toLowerCase();
}

function formatAvailabilityError(error: string) {
  if (error === "invalid-start-time") {
    return "Please choose a valid start time.";
  }

  if (error === "invalid-end-time") {
    return "Please choose a valid end time.";
  }

  if (error === "invalid-start-date") {
    return "Please choose a valid start date.";
  }

  if (error === "past-time") {
    return "You cannot add availability in the past.";
  }

  if (error === "invalid-duration") {
    return "Please choose a valid duration.";
  }

  if (error === "duration-too-short-for-service") {
    return "This window is shorter than your shortest active offer. Create a longer window or update your offer duration.";
  }

  if (error === "no-active-service") {
    return "Create at least one active offer before adding availability.";
  }

  if (error === "invalid-time-range") {
    return "Please choose a valid time range. End time must be after start time.";
  }

  if (error === "invalid-break") {
    return "Please choose a valid break duration.";
  }

  if (error === "invalid-repeat") {
    return "Please choose a valid repeat period.";
  }

  if (error === "missing-weekdays") {
    return "Please choose at least one weekday.";
  }

  if (error === "no-valid-slots") {
    return "No valid future windows could be created.";
  }

  if (error === "overlap") {
    return "This window overlaps with another availability window.";
  }

  if (error === "all-slots-overlap") {
    return "All generated windows overlap with existing availability.";
  }

  if (error === "too-many-slots") {
    return "You already have too many future windows. Delete some old windows first.";
  }

  if (error === "too-many-bulk-slots") {
    return "This bulk action would create too many windows at once. Reduce weeks or time range.";
  }

  if (error === "too-far-in-future") {
    return "This availability is too far in the future.";
  }

  if (error === "slot-not-found") {
    return "Availability window was not found.";
  }

  if (error === "cannot-delete-booked-slot") {
    return "You cannot delete a window that already has an active booking.";
  }

  if (error === "cannot-delete-past-slot") {
    return "You cannot delete a past window here.";
  }

  if (error === "not-signed-in") {
    return "Please sign in again.";
  }

  return "Something went wrong. Please try again.";
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}