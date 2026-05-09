import Link from "next/link";
import type { Prisma } from "@prisma/client";
import {
  ArrowLeft,
  Clock3,
  Database,
  Search,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";

import { requireRole } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

type AdminAuditPageProps = {
  searchParams?: Promise<{
    q?: string;
    action?: string;
    entity?: string;
  }>;
};

export default async function AdminAuditPage({
  searchParams,
}: AdminAuditPageProps) {
  await requireRole(["admin"]);

  const resolvedSearchParams = searchParams ? await searchParams : {};

  const query = resolvedSearchParams.q?.trim() ?? "";
  const actionFilter = resolvedSearchParams.action?.trim() ?? "";
  const entityFilter = resolvedSearchParams.entity?.trim() ?? "";

  const filters: Prisma.AdminAuditLogWhereInput[] = [];

  if (actionFilter) {
    filters.push({
      action: actionFilter,
    });
  }

  if (entityFilter) {
    filters.push({
      entityType: entityFilter,
    });
  }

  if (query) {
    filters.push({
      OR: [
        {
          id: {
            contains: query,
            mode: "insensitive" as const,
          },
        },
        {
          action: {
            contains: query,
            mode: "insensitive" as const,
          },
        },
        {
          entityType: {
            contains: query,
            mode: "insensitive" as const,
          },
        },
        {
          entityId: {
            contains: query,
            mode: "insensitive" as const,
          },
        },
        {
          adminEmail: {
            contains: query,
            mode: "insensitive" as const,
          },
        },
        {
          message: {
            contains: query,
            mode: "insensitive" as const,
          },
        },
      ],
    });
  }

  const auditWhere: Prisma.AdminAuditLogWhereInput =
    filters.length > 0
      ? {
          AND: filters,
        }
      : {};

  const [
    logs,
    totalLogs,
    recentAdminActions,
    entityGroups,
    failedActionsCount,
    refundActionsCount,
    disputeActionsCount,
    roleActionsCount,
  ] = await Promise.all([
    prisma.adminAuditLog.findMany({
      where: auditWhere,
      orderBy: {
        createdAt: "desc",
      },
      take: 120,
    }),

    prisma.adminAuditLog.count(),

    prisma.adminAuditLog.groupBy({
      by: ["action"],
      _count: {
        action: true,
      },
      orderBy: {
        _count: {
          action: "desc",
        },
      },
      take: 8,
    }),

    prisma.adminAuditLog.groupBy({
      by: ["entityType"],
      _count: {
        entityType: true,
      },
      orderBy: {
        _count: {
          entityType: "desc",
        },
      },
      take: 8,
    }),

    prisma.adminAuditLog.count({
      where: {
        action: {
          contains: "FAILED",
          mode: "insensitive" as const,
        },
      },
    }),

    prisma.adminAuditLog.count({
      where: {
        action: {
          contains: "REFUND",
          mode: "insensitive" as const,
        },
      },
    }),

    prisma.adminAuditLog.count({
      where: {
        OR: [
          {
            action: {
              contains: "DISPUTE",
              mode: "insensitive" as const,
            },
          },
          {
            action: {
              contains: "DISPUTED",
              mode: "insensitive" as const,
            },
          },
        ],
      },
    }),

    prisma.adminAuditLog.count({
      where: {
        action: {
          contains: "ROLE",
          mode: "insensitive" as const,
        },
      },
    }),
  ]);

  const shownFailedActions = logs.filter((log) =>
    log.action.toLowerCase().includes("failed"),
  ).length;

  const shownRefundActions = logs.filter((log) =>
    log.action.toLowerCase().includes("refund"),
  ).length;

  const shownDisputeActions = logs.filter(
    (log) =>
      log.action.toLowerCase().includes("dispute") ||
      log.action.toLowerCase().includes("disputed"),
  ).length;

  const hasActiveFilters = query || actionFilter || entityFilter;

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

          <Badge variant="primary" className="mt-8">
            <ShieldCheck size={14} />
            Audit log
          </Badge>

          <div className="mt-6 grid gap-8 xl:grid-cols-[1fr_360px] xl:items-end">
            <div>
              <h1 className="heading-lg max-w-4xl text-balance">
                Admin activity history.
              </h1>

              <p className="mt-4 max-w-2xl text-lg leading-8 text-muted">
                Track sensitive admin actions like role changes, expert
                moderation, refunds, disputes and booking status changes.
              </p>
            </div>

            <Card className="p-5">
              <Badge variant="accent">
                <Database size={14} />
                Current view
              </Badge>

              <div className="mt-5 grid gap-3">
                <SummaryRow label="Shown logs" value={String(logs.length)} />
                <SummaryRow
                  label="Shown failed"
                  value={String(shownFailedActions)}
                />
                <SummaryRow
                  label="Shown refunds"
                  value={String(shownRefundActions)}
                />
                <SummaryRow
                  label="Shown disputes"
                  value={String(shownDisputeActions)}
                />
              </div>
            </Card>
          </div>

          <div className="mt-8 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            <MiniStat label="Total logs" value={String(totalLogs)} />
            <MiniStat label="Shown" value={String(logs.length)} />
            <MiniStat label="Failed" value={String(failedActionsCount)} />
            <MiniStat label="Refunds" value={String(refundActionsCount)} />
            <MiniStat label="Disputes" value={String(disputeActionsCount)} />
            <MiniStat label="Role changes" value={String(roleActionsCount)} />
          </div>

          <form action="/admin/audit" className="mt-6">
            <div className="grid gap-3 rounded-[28px] border border-[var(--border)] bg-white/64 p-3 shadow-[var(--shadow-sm)] xl:grid-cols-[1fr_230px_220px_auto_auto] xl:items-center">
              <div className="relative">
                <Search
                  size={17}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted"
                />

                <input
                  name="q"
                  defaultValue={query}
                  placeholder="Search action, entity, admin email, message..."
                  className="input min-h-12 w-full pl-11"
                />
              </div>

              <input
                name="action"
                defaultValue={actionFilter}
                placeholder="Action, e.g. USER_ROLE_UPDATED"
                className="input min-h-12"
              />

              <input
                name="entity"
                defaultValue={entityFilter}
                placeholder="Entity, e.g. USER / EXPERT"
                className="input min-h-12"
              />

              <button type="submit" className="btn btn-primary">
                Filter
              </button>

              {hasActiveFilters ? (
                <Link href="/admin/audit" className="btn btn-secondary">
                  Clear
                </Link>
              ) : null}
            </div>
          </form>

          <div className="mt-6 flex flex-wrap gap-2">
            <QuickActionFilter
              action="USER_ROLE_UPDATED"
              label="Role changes"
              currentAction={actionFilter}
              q={query}
              entity={entityFilter}
            />
            <QuickActionFilter
              action="EXPERT_STATUS_UPDATED"
              label="Expert status"
              currentAction={actionFilter}
              q={query}
              entity={entityFilter}
            />
            <QuickActionFilter
              action="EXPERT_VERIFICATION_TOGGLED"
              label="Verification"
              currentAction={actionFilter}
              q={query}
              entity={entityFilter}
            />
            <QuickActionFilter
              action="BOOKING_STATUS_UPDATED"
              label="Booking status"
              currentAction={actionFilter}
              q={query}
              entity={entityFilter}
            />
            <QuickActionFilter
              action="BOOKING_REFUNDED"
              label="Refunds"
              currentAction={actionFilter}
              q={query}
              entity={entityFilter}
            />
            <QuickActionFilter
              action="BOOKING_REFUND_FAILED"
              label="Refund failures"
              currentAction={actionFilter}
              q={query}
              entity={entityFilter}
            />
            <QuickActionFilter
              action="BOOKING_DISPUTED"
              label="Disputes"
              currentAction={actionFilter}
              q={query}
              entity={entityFilter}
            />
            <QuickActionFilter
              action="DISPUTE_RESOLVED"
              label="Resolved disputes"
              currentAction={actionFilter}
              q={query}
              entity={entityFilter}
            />
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <QuickEntityFilter
              entity="USER"
              label="Users"
              currentEntity={entityFilter}
              q={query}
              action={actionFilter}
            />
            <QuickEntityFilter
              entity="EXPERT"
              label="Experts"
              currentEntity={entityFilter}
              q={query}
              action={actionFilter}
            />
            <QuickEntityFilter
              entity="BOOKING"
              label="Bookings"
              currentEntity={entityFilter}
              q={query}
              action={actionFilter}
            />
          </div>
        </div>
      </section>

      <section className="container-page py-8 md:py-10 lg:py-12">
        <div className="mb-5 flex flex-wrap gap-2">
          <Badge>Search: {query || "none"}</Badge>
          <Badge>Action: {actionFilter || "all"}</Badge>
          <Badge>Entity: {entityFilter || "all"}</Badge>
          <Badge>{logs.length} shown</Badge>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_320px] xl:items-start">
          <div className="grid gap-5">
            {logs.length > 0 ? (
              logs.map((log) => <AuditLogCard key={log.id} log={log} />)
            ) : (
              <Card className="p-8 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary-dark)]">
                  <Database size={24} />
                </div>

                <h2 className="mt-5 text-2xl font-black tracking-[-0.04em]">
                  No audit logs found
                </h2>

                <p className="mx-auto mt-3 max-w-md text-sm font-semibold leading-6 text-muted">
                  Try another search, action or entity filter. Admin actions
                  will appear here after they are recorded.
                </p>

                <div className="mt-5">
                  <Link href="/admin/audit" className="btn btn-secondary">
                    Clear filters
                  </Link>
                </div>
              </Card>
            )}
          </div>

          <aside className="grid gap-5 xl:sticky xl:top-[96px]">
            <Card className="p-5">
              <Badge variant="accent">
                <Database size={14} />
                Top actions
              </Badge>

              <div className="mt-5 grid gap-3">
                {recentAdminActions.length > 0 ? (
                  recentAdminActions.map((item) => (
                    <Link
                      key={item.action}
                      href={`/admin/audit?action=${encodeURIComponent(
                        item.action,
                      )}`}
                      className="hover-scale rounded-2xl border border-[var(--border)] bg-white/64 p-3 hover:bg-white hover:shadow-[var(--shadow-sm)]"
                    >
                      <p className="break-all text-sm font-black">
                        {item.action}
                      </p>
                      <p className="mt-1 text-xs font-bold text-muted">
                        {item._count.action} logs
                      </p>
                    </Link>
                  ))
                ) : (
                  <p className="text-sm font-semibold text-muted">
                    No actions yet.
                  </p>
                )}
              </div>
            </Card>

            <Card className="p-5">
              <Badge variant="primary">
                <ShieldCheck size={14} />
                Top entities
              </Badge>

              <div className="mt-5 grid gap-3">
                {entityGroups.length > 0 ? (
                  entityGroups.map((item) => (
                    <Link
                      key={item.entityType}
                      href={`/admin/audit?entity=${encodeURIComponent(
                        item.entityType,
                      )}`}
                      className="hover-scale rounded-2xl border border-[var(--border)] bg-white/64 p-3 hover:bg-white hover:shadow-[var(--shadow-sm)]"
                    >
                      <p className="break-all text-sm font-black">
                        {item.entityType}
                      </p>
                      <p className="mt-1 text-xs font-bold text-muted">
                        {item._count.entityType} logs
                      </p>
                    </Link>
                  ))
                ) : (
                  <p className="text-sm font-semibold text-muted">
                    No entities yet.
                  </p>
                )}
              </div>
            </Card>

            <Card soft className="p-5">
              <Badge variant="accent">
                <ShieldAlert size={14} />
                Security rule
              </Badge>

              <p className="mt-4 text-sm font-bold leading-6 text-muted">
                Keep audit logs immutable. Never edit or delete admin history in
                production unless required by a legal data retention policy.
              </p>
            </Card>
          </aside>
        </div>
      </section>
    </main>
  );
}

function AuditLogCard({
  log,
}: {
  log: {
    id: string;
    adminId: string | null;
    adminEmail: string | null;
    action: string;
    entityType: string;
    entityId: string | null;
    message: string | null;
    metadata: Prisma.JsonValue | null;
    createdAt: Date;
  };
}) {
  const isFailure = log.action.toLowerCase().includes("failed");
  const isRefund = log.action.toLowerCase().includes("refund");
  const isDispute =
    log.action.toLowerCase().includes("dispute") ||
    log.action.toLowerCase().includes("disputed");

  return (
    <Card className="p-5 md:p-6 hover-lift">
      <div className="min-w-0">
        <div className="flex flex-wrap gap-2">
          <Badge variant={isFailure ? "danger" : "primary"}>
            {isFailure ? <ShieldAlert size={14} /> : <ShieldCheck size={14} />}
            {log.action}
          </Badge>

          <Badge variant={isRefund ? "accent" : "primary"}>
            <Database size={14} />
            {log.entityType}
          </Badge>

          {isDispute ? (
            <Badge variant="danger">
              <ShieldAlert size={14} />
              Dispute related
            </Badge>
          ) : null}

          <Badge>
            <Clock3 size={14} />
            {formatDateTime(log.createdAt)}
          </Badge>
        </div>

        <h2 className="mt-4 text-2xl font-black tracking-[-0.04em]">
          {log.message ?? log.action}
        </h2>

        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <SmallFact
            label="Admin"
            value={log.adminEmail ?? log.adminId ?? "Unknown"}
          />
          <SmallFact label="Entity type" value={log.entityType} />
          <SmallFact label="Entity ID" value={log.entityId ?? "—"} />
          <SmallFact label="Log ID" value={log.id} />
        </div>

        {getEntityHref(log.entityType, log.entityId) ? (
          <div className="mt-4">
            <Link
              href={getEntityHref(log.entityType, log.entityId) ?? "/admin"}
              className="btn btn-secondary"
            >
              Open related {log.entityType.toLowerCase()}
            </Link>
          </div>
        ) : null}

        <pre className="mt-4 max-h-[240px] overflow-auto rounded-2xl border border-[var(--border)] bg-white/64 p-4 text-xs font-bold leading-6 text-muted">
          {formatMetadata(log.metadata)}
        </pre>
      </div>
    </Card>
  );
}

function QuickActionFilter({
  action,
  label,
  currentAction,
  q,
  entity,
}: {
  action: string;
  label: string;
  currentAction: string;
  q: string;
  entity: string;
}) {
  const isActive = currentAction === action;
  const params = new URLSearchParams();

  if (q) {
    params.set("q", q);
  }

  params.set("action", action);

  if (entity) {
    params.set("entity", entity);
  }

  return (
    <Link
      href={`/admin/audit?${params.toString()}`}
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

function QuickEntityFilter({
  entity,
  label,
  currentEntity,
  q,
  action,
}: {
  entity: string;
  label: string;
  currentEntity: string;
  q: string;
  action: string;
}) {
  const isActive = currentEntity === entity;
  const params = new URLSearchParams();

  if (q) {
    params.set("q", q);
  }

  if (action) {
    params.set("action", action);
  }

  params.set("entity", entity);

  return (
    <Link
      href={`/admin/audit?${params.toString()}`}
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

function MiniStat({ label, value }: { label: string; value: string }) {
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
      <p className="mt-1 break-all text-sm font-black">{value}</p>
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

function getEntityHref(entityType: string, entityId: string | null) {
  if (!entityId) {
    return null;
  }

  if (entityType === "USER") {
    return `/admin/users?q=${encodeURIComponent(entityId)}`;
  }

  if (entityType === "EXPERT") {
    return `/admin/experts?q=${encodeURIComponent(entityId)}`;
  }

  if (entityType === "BOOKING") {
    return `/admin/bookings?q=${encodeURIComponent(entityId)}`;
  }

  return null;
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("en", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatMetadata(metadata: Prisma.JsonValue | null) {
  try {
    return JSON.stringify(metadata ?? {}, null, 2);
  } catch {
    return "{}";
  }
}