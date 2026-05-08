import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  CalendarDays,
  Clock3,
  Layers3,
  Plus,
  Repeat,
  Trash2,
  Video,
} from "lucide-react";

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

const durationOptions = [15, 30, 45, 60];
const breakOptions = [0, 5, 10, 15, 30];
const repeatWeekOptions = [1, 2, 3, 4, 6, 8];
const MAX_VISIBLE_SLOTS = 60;

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

  const email = user.email?.toLowerCase();

  if (!email) {
    redirect("/sign-in");
  }

  const now = new Date();

  const expert = await prisma.expertProfile.findFirst({
    where: {
      user: {
        email,
      },
    },
    include: {
      availability: {
        orderBy: {
          startTime: "asc",
        },
      },
      bookings: {
        where: {
          startTime: {
            gte: now,
          },
          status: {
            in: ["PENDING", "PAID", "CONFIRMED"],
          },
        },
        include: {
          service: true,
          buyer: true,
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

  const upcomingSlots = expert.availability.filter((slot) => slot.startTime >= now);
  const openSlots = upcomingSlots.filter((slot) => !slot.isBooked);
  const bookedSlots = upcomingSlots.filter((slot) => slot.isBooked);
  const pastSlots = expert.availability.filter((slot) => slot.startTime < now);
  const pastOpenSlots = pastSlots.filter((slot) => !slot.isBooked);

  const filteredSlots = filterSlotsByView({
    slots: expert.availability,
    view: currentView,
    now,
  });

  const visibleSlots = filteredSlots.slice(0, MAX_VISIBLE_SLOTS);
  const hiddenSlotsCount = Math.max(filteredSlots.length - visibleSlots.length, 0);
  const groupedSlots = groupSlotsByDate(visibleSlots);

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

  return (
    <main>
      <section className="relative overflow-hidden border-b border-[var(--border)]">
        <div className="surface-grid absolute inset-0 opacity-40" />

        <div className="relative p-6 md:p-8 lg:p-10">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <Link
                href="/expert"
                className="inline-flex items-center gap-2 text-sm font-black text-[var(--primary-dark)]"
              >
                <ArrowLeft size={16} />
                Back to dashboard
              </Link>

              {resolvedSearchParams.saved ? (
                <div className="mt-6 rounded-2xl border border-[var(--success)]/20 bg-[var(--success-soft)] p-4 text-sm font-black text-[var(--success)]">
                  {createdCount && createdCount > 0
                    ? `${createdCount} availability slot${
                        createdCount === 1 ? "" : "s"
                      } created.${
                        skippedCount && skippedCount > 0
                          ? ` ${skippedCount} overlapping slot${
                              skippedCount === 1 ? "" : "s"
                            } skipped.`
                          : ""
                      }`
                    : "Availability added. Clients can now book this open time."}
                </div>
              ) : null}

              {resolvedSearchParams.deleted ? (
                <div className="mt-6 rounded-2xl border border-[var(--success)]/20 bg-[var(--success-soft)] p-4 text-sm font-black text-[var(--success)]">
                  {deletedCount && deletedCount > 1
                    ? `${deletedCount} old open slots removed.`
                    : "Availability slot removed."}
                </div>
              ) : null}

              {resolvedSearchParams.error ? (
                <div className="mt-6 rounded-2xl border border-[var(--danger)]/20 bg-[var(--danger-soft)] p-4 text-sm font-bold text-[var(--danger)]">
                  {formatAvailabilityError(resolvedSearchParams.error)}
                </div>
              ) : null}

              <div className="mt-6">
                <Badge variant="primary">
                  <CalendarDays size={14} />
                  Availability
                </Badge>
              </div>

              <h1 className="heading-lg mt-5 max-w-4xl text-balance">
                Manage your bookable time.
              </h1>

              <p className="mt-4 max-w-2xl text-lg leading-8 text-muted">
                Add single slots, bulk-create weekly availability, filter your
                calendar and keep your bookable schedule clean.
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
            <MiniStat label="Open" value={String(openSlots.length)} />
            <MiniStat label="Booked" value={String(bookedSlots.length)} />
            <MiniStat label="Past" value={String(pastSlots.length)} />
            <MiniStat label="Total" value={String(expert.availability.length)} />
          </div>
        </div>
      </section>

      <section className="p-6 md:p-8 lg:p-10">
        <div className="grid gap-5">
          <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr] xl:items-start">
            <details className="self-start rounded-[26px] border border-[var(--border)] bg-white/72 p-4 shadow-[var(--shadow-sm)] backdrop-blur">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-[20px]">
                <div className="flex items-center gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary-dark)]">
                    <Plus size={20} />
                  </div>

                  <div>
                    <p className="font-black tracking-[-0.02em]">
                      Add available time
                    </p>
                    <p className="mt-1 text-sm font-semibold text-muted">
                      Add one bookable slot.
                    </p>
                  </div>
                </div>

                <div className="btn btn-primary hidden sm:inline-flex">
                  Add slot
                  <ArrowRight size={17} />
                </div>
              </summary>

              <div className="mt-4 border-t border-[var(--border)] pt-4">
                <form
                  action={createAvailabilityAction}
                  className="grid gap-4 md:grid-cols-[1fr_160px_auto] md:items-end"
                >
                  <div>
                    <label htmlFor="startTime" className="text-sm font-black">
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
                  </div>

                  <div>
                    <label
                      htmlFor="durationMinutes"
                      className="text-sm font-black"
                    >
                      Duration
                    </label>

                    <select
                      id="durationMinutes"
                      name="durationMinutes"
                      required
                      defaultValue="15"
                      className="input mt-2"
                    >
                      {durationOptions.map((duration) => (
                        <option key={duration} value={duration}>
                          {duration} min
                        </option>
                      ))}
                    </select>
                  </div>

                  <button type="submit" className="btn btn-primary">
                    Add
                    <ArrowRight size={18} />
                  </button>
                </form>
              </div>
            </details>

            <details className="self-start rounded-[26px] border border-[var(--border)] bg-white/72 p-4 shadow-[var(--shadow-sm)] backdrop-blur">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
                    <Repeat size={20} />
                  </div>

                  <div>
                    <p className="font-black tracking-[-0.02em]">
                      Bulk create slots
                    </p>
                    <p className="mt-1 text-sm font-semibold text-muted">
                      Create repeated availability for the next weeks.
                    </p>
                  </div>
                </div>

                <Badge variant="accent">Weekly</Badge>
              </summary>

              <div className="mt-4 border-t border-[var(--border)] pt-4">
                <form action={createBulkAvailabilityAction} className="grid gap-5">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <label htmlFor="startDate" className="text-sm font-black">
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
                        className="text-sm font-black"
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
                      <label htmlFor="bulkEndTime" className="text-sm font-black">
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
                    <p className="text-sm font-black">Weekdays</p>

                    <div className="mt-2 flex flex-wrap gap-2">
                      {weekdays.map((day) => (
                        <label
                          key={day.value}
                          className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-[var(--border)] bg-white/64 px-4 py-2 text-sm font-black text-[var(--muted-foreground)] transition hover:bg-white hover:text-[var(--primary-dark)]"
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
                        className="text-sm font-black"
                      >
                        Slot duration
                      </label>

                      <select
                        id="bulkDurationMinutes"
                        name="durationMinutes"
                        required
                        defaultValue="30"
                        className="input mt-2"
                      >
                        {durationOptions.map((duration) => (
                          <option key={duration} value={duration}>
                            {duration} min
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="breakMinutes"
                        className="text-sm font-black"
                      >
                        Break
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
                    </div>

                    <div>
                      <label htmlFor="repeatWeeks" className="text-sm font-black">
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

                  <div className="rounded-2xl border border-[var(--border)] bg-white/55 p-4">
                    <p className="text-sm font-bold leading-6 text-muted">
                      Existing overlapping slots will be skipped automatically.
                      Maximum bulk creation is limited to keep your calendar
                      clean.
                    </p>
                  </div>

                  <button type="submit" className="btn btn-primary w-full">
                    Create weekly slots
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
                  Compact calendar
                </Badge>

                <h2 className="mt-4 text-3xl font-black tracking-[-0.05em]">
                  Time slots
                </h2>

                <p className="mt-2 max-w-2xl leading-7 text-muted">
                  Showing {visibleSlots.length} of {filteredSlots.length} slots.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {pastOpenSlots.length > 0 ? (
                  <form action={deletePastOpenAvailabilityAction}>
                    <button type="submit" className="btn btn-secondary">
                      Clean past open slots
                      <Trash2 size={17} />
                    </button>
                  </form>
                ) : null}

                {hiddenSlotsCount > 0 ? (
                  <Badge variant="accent">+{hiddenSlotsCount} more hidden</Badge>
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
                      ? "flex shrink-0 items-center rounded-full bg-[var(--primary)] px-4 py-2 text-xs font-black text-white"
                      : "flex shrink-0 items-center rounded-full border border-[var(--border)] bg-white/72 px-4 py-2 text-xs font-black text-[var(--muted-foreground)] transition hover:bg-white hover:text-[var(--foreground)]"
                  }
                >
                  {tab.label}
                </Link>
              ))}
            </div>

            <div className="mt-6 grid gap-4">
              {groupedSlots.length > 0 ? (
                groupedSlots.map((group) => (
                  <details
                    key={group.label}
                    open
                    className="rounded-[22px] border border-[var(--border)] bg-white/45 p-4"
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-black uppercase tracking-[0.14em] text-muted">
                          {group.label}
                        </p>

                        <p className="mt-1 text-xs font-bold text-muted">
                          {group.openCount} open · {group.bookedCount} booked
                        </p>
                      </div>

                      <Badge>{group.slots.length} slots</Badge>
                    </summary>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {group.slots.map((slot) => (
                        <SlotChip key={slot.id} slot={slot} />
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
                      className="rounded-2xl border border-[var(--border)] bg-white/64 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-black">
                            {booking.service?.title ?? "Provider call"}
                          </p>

                          <p className="mt-1 text-sm text-muted">
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
                  <div className="rounded-[22px] border border-dashed border-[var(--border-strong)] bg-white/55 p-5">
                    <p className="font-black">No upcoming bookings</p>
                    <p className="mt-2 text-sm leading-6 text-muted">
                      Client bookings will appear here after someone reserves
                      your time.
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
                <CompactTip text="Keep 7–14 days of open slots visible." />
                <CompactTip text="Use bulk create to prepare your week faster." />
                <CompactTip text="Delete old open slots to keep the calendar clean." />
                <CompactTip text="Short 15–30 minute slots can increase bookings." />
              </div>
            </Card>
          </div>
        </div>
      </section>
    </main>
  );
}

function SlotChip({
  slot,
}: {
  slot: {
    id: string;
    startTime: Date;
    endTime: Date;
    isBooked: boolean;
  };
}) {
  const isPast = slot.startTime < new Date();

  return (
    <div
      className={
        slot.isBooked
          ? "group inline-flex min-h-10 items-center gap-2 rounded-full border border-[var(--success)]/20 bg-[var(--success-soft)] px-3 py-2 text-sm font-black text-[var(--success)]"
          : isPast
            ? "group inline-flex min-h-10 items-center gap-2 rounded-full border border-[var(--border)] bg-white/45 px-3 py-2 text-sm font-black text-muted"
            : "group inline-flex min-h-10 items-center gap-2 rounded-full border border-[var(--border)] bg-white px-3 py-2 text-sm font-black text-[var(--foreground)] shadow-sm transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-sm)]"
      }
      title={`${formatTime(slot.startTime)} — ${formatTime(slot.endTime)}`}
    >
      <Clock3 size={14} />

      <span>
        {formatTime(slot.startTime)}–{formatTime(slot.endTime)}
      </span>

      {slot.isBooked ? (
        <span className="rounded-full bg-white/70 px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em]">
          Booked
        </span>
      ) : isPast ? (
        <span className="rounded-full bg-white/70 px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em]">
          Past
        </span>
      ) : (
        <form action={deleteAvailabilityAction}>
          <input type="hidden" name="slotId" value={slot.id} />

          <button
            type="submit"
            className="ml-1 flex h-6 w-6 items-center justify-center rounded-full text-muted transition hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]"
            aria-label="Delete slot"
            title="Delete slot"
          >
            <Trash2 size={13} />
          </button>
        </form>
      )}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <Card soft className="p-4">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
        {label}
      </p>

      <p className="mt-2 text-2xl font-black tracking-[-0.04em]">{value}</p>
    </Card>
  );
}

function CompactTip({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-white/62 p-4">
      <p className="text-sm font-bold leading-6 text-muted">{text}</p>
    </div>
  );
}

function EmptyState({ view }: { view: AvailabilityView }) {
  return (
    <div className="rounded-[24px] border border-dashed border-[var(--border-strong)] bg-white/55 p-7 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary-dark)]">
        <CalendarDays size={22} />
      </div>

      <h3 className="mt-4 text-2xl font-black tracking-[-0.04em]">
        No slots found
      </h3>

      <p className="mx-auto mt-3 max-w-md leading-7 text-muted">
        There are no slots for the “{view}” filter. Add availability or choose
        another filter.
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

function filterSlotsByView({
  slots,
  view,
  now,
}: {
  slots: {
    id: string;
    startTime: Date;
    endTime: Date;
    isBooked: boolean;
  }[];
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
    return slots.filter((slot) => slot.startTime >= now && !slot.isBooked);
  }

  if (view === "booked") {
    return slots.filter((slot) => slot.startTime >= now && slot.isBooked);
  }

  if (view === "today") {
    return slots.filter(
      (slot) => slot.startTime >= todayStart && slot.startTime <= todayEnd,
    );
  }

  if (view === "week") {
    return slots.filter((slot) => slot.startTime >= now && slot.startTime <= weekEnd);
  }

  if (view === "past") {
    return slots
      .filter((slot) => slot.startTime < now)
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
  }

  return slots.filter((slot) => slot.startTime >= now);
}

function groupSlotsByDate(
  slots: {
    id: string;
    startTime: Date;
    endTime: Date;
    isBooked: boolean;
  }[],
) {
  const groups = new Map<
    string,
    {
      label: string;
      openCount: number;
      bookedCount: number;
      slots: {
        id: string;
        startTime: Date;
        endTime: Date;
        isBooked: boolean;
      }[];
    }
  >();

  slots.forEach((slot) => {
    const label = new Intl.DateTimeFormat("en", {
      weekday: "long",
      month: "short",
      day: "numeric",
    }).format(slot.startTime);

    const existing = groups.get(label);

    if (existing) {
      existing.slots.push(slot);

      if (slot.isBooked) {
        existing.bookedCount += 1;
      } else {
        existing.openCount += 1;
      }

      return;
    }

    groups.set(label, {
      label,
      openCount: slot.isBooked ? 0 : 1,
      bookedCount: slot.isBooked ? 1 : 0,
      slots: [slot],
    });
  });

  return Array.from(groups.values());
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
    return "Paid";
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

  return status.toLowerCase();
}

function formatAvailabilityError(error: string) {
  if (error === "invalid-start-time") {
    return "Please choose a valid start time.";
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

  if (error === "invalid-time-range") {
    return "Please choose a valid time range.";
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
    return "No valid future slots could be created.";
  }

  if (error === "overlap") {
    return "This slot overlaps with another availability slot.";
  }

  if (error === "all-slots-overlap") {
    return "All generated slots overlap with existing availability.";
  }

  if (error === "too-many-slots") {
    return "You already have too many future slots. Delete some old slots first.";
  }

  if (error === "too-many-bulk-slots") {
    return "This bulk action would create too many slots at once. Reduce weeks or time range.";
  }

  if (error === "slot-not-found") {
    return "Availability slot was not found.";
  }

  if (error === "cannot-delete-booked-slot") {
    return "You cannot delete a slot that already has a booking.";
  }

  if (error === "cannot-delete-past-slot") {
    return "You cannot delete a past slot here.";
  }

  if (error === "not-signed-in") {
    return "Please sign in again.";
  }

  return "Something went wrong. Please try again.";
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("en", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}