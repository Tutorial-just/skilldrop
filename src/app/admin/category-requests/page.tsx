import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Layers3,
  Lightbulb,
  Merge,
  Search,
  ShieldCheck,
  Trash2,
  XCircle,
} from "lucide-react";
import { CategoryRequestStatus } from "@prisma/client";

import {
  deleteCategoryRequestAction,
  updateCategoryRequestStatusAction,
} from "@/server/actions/category-request.actions";
import { requireRole } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

type AdminCategoryRequestsPageProps = {
  searchParams?: Promise<{
    status?: string;
    saved?: string;
    deleted?: string;
    error?: string;
  }>;
};

const statusTabs: {
  label: string;
  value: "ALL" | CategoryRequestStatus;
}[] = [
  {
    label: "All",
    value: "ALL",
  },
  {
    label: "Pending",
    value: CategoryRequestStatus.PENDING,
  },
  {
    label: "Approved",
    value: CategoryRequestStatus.APPROVED,
  },
  {
    label: "Merged",
    value: CategoryRequestStatus.MERGED,
  },
  {
    label: "Rejected",
    value: CategoryRequestStatus.REJECTED,
  },
];

export default async function AdminCategoryRequestsPage({
  searchParams,
}: AdminCategoryRequestsPageProps) {
  await requireRole(["admin"]);

  const resolvedSearchParams = searchParams ? await searchParams : {};
  const statusFilter = parseStatusFilter(resolvedSearchParams.status);

  const where =
    statusFilter === "ALL"
      ? {}
      : {
          status: statusFilter,
        };

  const [requests, counters] = await Promise.all([
    prisma.categoryRequest.findMany({
      where,
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        category: {
          select: {
            name: true,
            slug: true,
          },
        },
      },
      orderBy: [
        {
          status: "asc",
        },
        {
          createdAt: "desc",
        },
      ],
      take: 100,
    }),
    prisma.categoryRequest.groupBy({
      by: ["status"],
      _count: {
        status: true,
      },
    }),
  ]);

  const totalCount = counters.reduce((sum, row) => sum + row._count.status, 0);
  const pendingCount = getCount(counters, CategoryRequestStatus.PENDING);
  const approvedCount = getCount(counters, CategoryRequestStatus.APPROVED);
  const mergedCount = getCount(counters, CategoryRequestStatus.MERGED);
  const rejectedCount = getCount(counters, CategoryRequestStatus.REJECTED);

  return (
    <main>
      <section className="relative overflow-hidden border-b border-[var(--border)]">
        <div className="surface-grid absolute inset-0 opacity-40" />
        <div className="absolute left-[-160px] top-[-180px] h-[420px] w-[420px] rounded-full bg-[var(--primary)]/10 blur-3xl" />
        <div className="absolute bottom-[-220px] right-[-160px] h-[420px] w-[420px] rounded-full bg-[var(--accent)]/10 blur-3xl" />

        <div className="relative p-6 md:p-8 lg:p-10">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-sm font-bold text-[var(--primary-dark)]"
          >
            <ArrowLeft size={16} />
            Back to admin
          </Link>

          <div className="mt-6">
            <Badge variant="primary">
              <ShieldCheck size={14} />
              Category demand
            </Badge>

            <h1 className="heading-lg mt-5 max-w-4xl text-balance">
              Missing help requests.
            </h1>

            <p className="mt-4 max-w-2xl text-lg leading-8 text-[var(--muted-foreground)]">
              These are searches where buyers did not find the right helper or
              category. Use them to decide what SkillDrop should add next.
            </p>
          </div>

          {resolvedSearchParams.saved ? (
            <div className="mt-7 max-w-3xl rounded-2xl border border-[var(--success)]/20 bg-[var(--success-soft)] p-4 text-sm font-bold text-[var(--success)]">
              Request updated.
            </div>
          ) : null}

          {resolvedSearchParams.deleted ? (
            <div className="mt-7 max-w-3xl rounded-2xl border border-[var(--success)]/20 bg-[var(--success-soft)] p-4 text-sm font-bold text-[var(--success)]">
              Request deleted.
            </div>
          ) : null}

          {resolvedSearchParams.error ? (
            <div className="mt-7 max-w-3xl rounded-2xl border border-[var(--danger)]/20 bg-[var(--danger-soft)] p-4 text-sm font-bold text-[var(--danger)]">
              Could not update this request.
            </div>
          ) : null}

          <div className="mt-8 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <MetricCard icon={Layers3} label="Total" value={String(totalCount)} />
            <MetricCard icon={Clock3} label="Pending" value={String(pendingCount)} />
            <MetricCard icon={CheckCircle2} label="Approved" value={String(approvedCount)} />
            <MetricCard icon={Merge} label="Merged" value={String(mergedCount)} />
            <MetricCard icon={XCircle} label="Rejected" value={String(rejectedCount)} />
          </div>
        </div>
      </section>

      <section className="p-6 md:p-8 lg:p-10">
        <div className="grid gap-6">
          <Card className="p-4 md:p-5">
            <div className="flex flex-wrap gap-2">
              {statusTabs.map((tab) => (
                <Link
                  key={tab.value}
                  href={
                    tab.value === "ALL"
                      ? "/admin/category-requests"
                      : `/admin/category-requests?status=${tab.value}`
                  }
                  className={
                    statusFilter === tab.value
                      ? "rounded-full bg-[var(--primary)] px-4 py-2 text-sm font-bold text-white"
                      : "rounded-full border border-[var(--border)] bg-[var(--card-soft)] px-4 py-2 text-sm font-bold text-[var(--muted-foreground)] transition hover:border-[var(--border-strong)] hover:bg-[var(--background-soft)]"
                  }
                >
                  {tab.label}
                </Link>
              ))}
            </div>
          </Card>

          <Card soft className="p-5 md:p-6">
            <Badge variant="accent">
              <Lightbulb size={14} />
              Moderation rule
            </Badge>

            <p className="mt-3 text-sm font-medium leading-6 text-[var(--muted-foreground)]">
              Do not create a public category for every request. Approve only
              useful and safe topics. Merge duplicates into existing categories.
              Reject illegal, harmful, hateful, manipulative or unsafe requests.
            </p>
          </Card>

          <div className="grid gap-4">
            {requests.length > 0 ? (
              requests.map((request) => (
                <RequestCard key={request.id} request={request} />
              ))
            ) : (
              <Card className="p-8 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary-dark)]">
                  <Search size={24} />
                </div>

                <h2 className="mt-5 text-2xl font-black tracking-[-0.04em]">
                  No requests found
                </h2>

                <p className="mx-auto mt-3 max-w-md text-sm font-medium leading-6 text-[var(--muted-foreground)]">
                  New buyer requests will appear here when users cannot find the
                  help they need.
                </p>
              </Card>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function RequestCard({
  request,
}: {
  request: {
    id: string;
    query: string;
    suggestedName: string | null;
    description: string | null;
    status: CategoryRequestStatus;
    adminNote: string | null;
    createdAt: Date;
    user: {
      name: string | null;
      email: string;
    } | null;
    category: {
      name: string;
      slug: string;
    } | null;
  };
}) {
  return (
    <Card className="p-5 md:p-6">
      <div className="grid gap-5 xl:grid-cols-[1fr_360px] xl:items-start">
        <div>
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={request.status} />

            {request.category ? (
              <Badge variant="primary">{request.category.name}</Badge>
            ) : (
              <Badge variant="accent">No close category</Badge>
            )}
          </div>

          <h2 className="mt-4 text-2xl font-black tracking-[-0.04em]">
            {request.query}
          </h2>

          {request.suggestedName ? (
            <p className="mt-2 text-sm font-bold text-[var(--primary-dark)]">
              Suggested: {request.suggestedName}
            </p>
          ) : null}

          {request.description ? (
            <p className="mt-4 whitespace-pre-wrap text-sm font-medium leading-7 text-[var(--muted-foreground)]">
              {request.description}
            </p>
          ) : (
            <p className="mt-4 text-sm font-medium leading-7 text-[var(--muted-foreground)]">
              No extra details provided.
            </p>
          )}

          <div className="mt-5 flex flex-wrap gap-2 text-xs font-bold text-[var(--muted-foreground)]">
            <span>
              From:{" "}
              {request.user
                ? request.user.name ?? request.user.email
                : "Guest / unknown user"}
            </span>
            <span>·</span>
            <span>{formatDate(request.createdAt)}</span>
          </div>

          {request.adminNote ? (
            <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] p-3 text-sm font-medium leading-6 text-[var(--muted-foreground)]">
              <span className="font-bold text-[var(--foreground)]">
                Admin note:
              </span>{" "}
              {request.adminNote}
            </div>
          ) : null}
        </div>

        <div className="rounded-[24px] border border-[var(--border)] bg-[var(--card-soft)] p-4">
          <form action={updateCategoryRequestStatusAction} className="grid gap-3">
            <input type="hidden" name="requestId" value={request.id} />

            <label
              htmlFor={`status-${request.id}`}
              className="text-sm font-bold text-[var(--foreground)]"
            >
              Status
            </label>

            <select
              id={`status-${request.id}`}
              name="status"
              defaultValue={request.status}
              className="input"
            >
              <option value={CategoryRequestStatus.PENDING}>Pending</option>
              <option value={CategoryRequestStatus.APPROVED}>Approved</option>
              <option value={CategoryRequestStatus.MERGED}>Merged</option>
              <option value={CategoryRequestStatus.REJECTED}>Rejected</option>
            </select>

            <label
              htmlFor={`admin-note-${request.id}`}
              className="text-sm font-bold text-[var(--foreground)]"
            >
              Admin note
            </label>

            <textarea
              id={`admin-note-${request.id}`}
              name="adminNote"
              rows={3}
              defaultValue={request.adminNote ?? ""}
              placeholder="Example: merge with Relationships / Dating advice"
              className="w-full rounded-[18px] border border-[var(--border)] bg-[var(--background-soft)] p-3 text-sm font-medium leading-6 outline-none transition focus:border-[var(--primary)]/50 focus:shadow-[0_0_0_4px_rgba(79,70,229,0.11)]"
            />

            <button type="submit" className="btn btn-primary">
              Save status
            </button>
          </form>

          <form action={deleteCategoryRequestAction} className="mt-3">
            <input type="hidden" name="requestId" value={request.id} />
            <button type="submit" className="btn btn-secondary w-full">
              <Trash2 size={17} />
              Delete
            </button>
          </form>
        </div>
      </div>
    </Card>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Layers3;
  label: string;
  value: string;
}) {
  return (
    <Card soft className="p-5">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary-dark)]">
        <Icon size={20} />
      </div>

      <p className="mt-4 text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
        {label}
      </p>

      <p className="mt-2 text-3xl font-bold tracking-[-0.04em] text-[var(--foreground)]">
        {value}
      </p>
    </Card>
  );
}

function StatusBadge({ status }: { status: CategoryRequestStatus }) {
  if (status === CategoryRequestStatus.PENDING) {
    return (
      <Badge variant="accent">
        <Clock3 size={14} />
        Pending
      </Badge>
    );
  }

  if (status === CategoryRequestStatus.APPROVED) {
    return (
      <Badge variant="success">
        <CheckCircle2 size={14} />
        Approved
      </Badge>
    );
  }

  if (status === CategoryRequestStatus.MERGED) {
    return (
      <Badge variant="primary">
        <Merge size={14} />
        Merged
      </Badge>
    );
  }

  return (
    <Badge variant="danger">
      <XCircle size={14} />
      Rejected
    </Badge>
  );
}

function parseStatusFilter(value?: string) {
  if (
    value === CategoryRequestStatus.PENDING ||
    value === CategoryRequestStatus.APPROVED ||
    value === CategoryRequestStatus.REJECTED ||
    value === CategoryRequestStatus.MERGED
  ) {
    return value;
  }

  return "ALL" as const;
}

function getCount(
  counters: {
    status: CategoryRequestStatus;
    _count: {
      status: number;
    };
  }[],
  status: CategoryRequestStatus,
) {
  return counters.find((row) => row.status === status)?._count.status ?? 0;
}

function formatDate(date: Date) {
  const datePart = new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);

  const timePart = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);

  return `${datePart} · ${timePart}`;
}
