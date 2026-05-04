import Link from "next/link";
import {
  ArrowLeft,
  Clock3,
  Database,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { requireRole } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

type AdminAuditPageProps = {
  searchParams?: Promise<{
    action?: string;
    entity?: string;
  }>;
};

export default async function AdminAuditPage({
  searchParams,
}: AdminAuditPageProps) {
  await requireRole(["admin"]);

  const resolvedSearchParams = searchParams ? await searchParams : {};

  const actionFilter = resolvedSearchParams.action?.trim() ?? "";
  const entityFilter = resolvedSearchParams.entity?.trim() ?? "";

  const logs = await prisma.adminAuditLog.findMany({
    where: {
      ...(actionFilter
        ? {
            action: actionFilter,
          }
        : {}),
      ...(entityFilter
        ? {
            entityType: entityFilter,
          }
        : {}),
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 100,
  });

  const totalLogs = await prisma.adminAuditLog.count();

  const recentAdminActions = await prisma.adminAuditLog.groupBy({
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
  });

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

          <h1 className="heading-lg mt-5 max-w-4xl text-balance">
            Admin activity history.
          </h1>

          <p className="mt-4 max-w-2xl text-lg leading-8 text-muted">
            Track sensitive admin actions like role changes, expert moderation,
            refunds, disputes and booking status changes.
          </p>

          <div className="mt-8 grid gap-3 md:grid-cols-3">
            <MiniStat label="Total logs" value={String(totalLogs)} />
            <MiniStat label="Shown" value={String(logs.length)} />
            <MiniStat
              label="Filter"
              value={actionFilter || entityFilter ? "Active" : "None"}
            />
          </div>

          <form action="/admin/audit" className="mt-6">
            <div className="grid gap-3 rounded-[28px] border border-[var(--border)] bg-white/64 p-3 shadow-[var(--shadow-sm)] md:grid-cols-[1fr_1fr_auto_auto] md:items-center">
              <input
                name="action"
                defaultValue={actionFilter}
                placeholder="Action, e.g. USER_ROLE_UPDATED"
                className="input min-h-12"
              />

              <input
                name="entity"
                defaultValue={entityFilter}
                placeholder="Entity, e.g. USER / EXPERT / BOOKING"
                className="input min-h-12"
              />

              <button type="submit" className="btn btn-primary">
                Filter
              </button>

              {actionFilter || entityFilter ? (
                <Link href="/admin/audit" className="btn btn-secondary">
                  Clear
                </Link>
              ) : null}
            </div>
          </form>
        </div>
      </section>

      <section className="container-page py-8 md:py-10 lg:py-12">
        <div className="grid gap-6 xl:grid-cols-[1fr_320px] xl:items-start">
          <div className="grid gap-5">
            {logs.length > 0 ? (
              logs.map((log) => <AuditLogCard key={log.id} log={log} />)
            ) : (
              <Card className="p-8 text-center">
                <h2 className="text-2xl font-black tracking-[-0.04em]">
                  No audit logs found
                </h2>

                <p className="mt-3 text-sm font-semibold text-muted">
                  Admin actions will appear here after they are recorded.
                </p>
              </Card>
            )}
          </div>

          <Card className="p-5">
            <Badge variant="accent">
              <Database size={14} />
              Top actions
            </Badge>

            <div className="mt-5 grid gap-3">
              {recentAdminActions.length > 0 ? (
                recentAdminActions.map((item) => (
                  <div
                    key={item.action}
                    className="rounded-2xl border border-[var(--border)] bg-white/64 p-3"
                  >
                    <p className="break-all text-sm font-black">
                      {item.action}
                    </p>
                    <p className="mt-1 text-xs font-bold text-muted">
                      {item._count.action} logs
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm font-semibold text-muted">
                  No actions yet.
                </p>
              )}
            </div>
          </Card>
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
    metadata: unknown;
    createdAt: Date;
  };
}) {
  return (
    <Card className="p-5 md:p-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            <Badge variant="primary">
              <ShieldCheck size={14} />
              {log.action}
            </Badge>

            <Badge>
              <Database size={14} />
              {log.entityType}
            </Badge>

            <Badge>
              <Clock3 size={14} />
              {formatDateTime(log.createdAt)}
            </Badge>
          </div>

          <h2 className="mt-4 text-2xl font-black tracking-[-0.04em]">
            {log.message ?? log.action}
          </h2>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <SmallFact
              label="Admin"
              value={log.adminEmail ?? log.adminId ?? "Unknown"}
            />
            <SmallFact label="Entity type" value={log.entityType} />
            <SmallFact label="Entity ID" value={log.entityId ?? "—"} />
          </div>

          <pre className="mt-4 max-h-[220px] overflow-auto rounded-2xl border border-[var(--border)] bg-white/64 p-4 text-xs font-bold leading-6 text-muted">
            {JSON.stringify(log.metadata, null, 2)}
          </pre>
        </div>
      </div>
    </Card>
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