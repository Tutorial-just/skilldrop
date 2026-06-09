import Link from "next/link";
import { ArrowLeft, CheckCircle2, ClipboardCheck, Euro, ShieldAlert, Tags } from "lucide-react";

import { requireRole } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import { formatMoneyFromCents } from "@/config/pricing";
import { updateServiceModerationAction } from "@/server/actions/service-moderation.actions";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export const metadata = {
  title: "Service moderation | SkillDrop admin",
};

export default async function AdminServicesPage() {
  await requireRole(["admin"]);

  const [pending, needsChanges, rejected, approved, recent] = await Promise.all([
    prisma.service.count({ where: { moderationStatus: "PENDING" } }),
    prisma.service.count({ where: { moderationStatus: "NEEDS_CHANGES" } }),
    prisma.service.count({ where: { moderationStatus: "REJECTED" } }),
    prisma.service.count({ where: { moderationStatus: "APPROVED", isActive: true } }),
    prisma.service.findMany({
      include: { expert: { include: { user: true } }, category: true, subcategory: true },
      orderBy: { updatedAt: "desc" },
      take: 30,
    }),
  ]);

  return (
    <main className="container-page py-8 md:py-10 lg:py-12">
      <Link href="/admin" className="inline-flex items-center gap-2 text-sm font-bold text-[var(--primary-dark)]"><ArrowLeft size={16} /> Back to admin</Link>
      <div className="mt-8 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <Badge variant="primary"><ClipboardCheck size={14} /> Service moderation</Badge>
          <h1 className="heading-lg mt-5 max-w-4xl text-balance">Keep the marketplace offer quality clean.</h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-[var(--muted-foreground)]">Review helper services, detect vague offers and keep public listings useful before scaling traffic.</p>
        </div>
      </div>

      <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric label="Pending" value={pending} tone="accent" />
        <Metric label="Needs changes" value={needsChanges} tone="accent" />
        <Metric label="Rejected" value={rejected} tone="danger" />
        <Metric label="Approved active" value={approved} tone="success" />
      </section>

      <Card className="mt-8 p-5 md:p-6">
        <Badge variant="accent"><ShieldAlert size={14} /> Recent services</Badge>
        <div className="mt-5 grid gap-3">
          {recent.map((service) => (
            <div key={service.id} className="grid gap-4 rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] p-4 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant={service.moderationStatus === "APPROVED" ? "success" : service.moderationStatus === "REJECTED" ? "danger" : "accent"}>{service.moderationStatus.replaceAll("_", " ")}</Badge>
                  {service.category ? <Badge><Tags size={14} /> {service.category.name}</Badge> : null}
                  <Badge><Euro size={14} /> {formatMoneyFromCents(service.priceCents)}</Badge>
                </div>
                <h2 className="mt-3 text-lg font-black tracking-[-0.03em]">{service.title}</h2>
                <p className="mt-1 text-sm font-semibold text-[var(--muted-foreground)]">{service.expert.user.name ?? service.expert.user.email} · {service.durationMinutes} min</p>
                <p className="mt-2 line-clamp-2 text-sm font-medium leading-6 text-[var(--muted-foreground)]">{service.description}</p>
              </div>
              <div className="grid gap-2 lg:w-[260px]">
                <Link href={`/experts/${service.expertId}?service=${service.id}`} className="btn btn-secondary w-full">View public offer</Link>
                <form action={updateServiceModerationAction} className="grid gap-2">
                  <input type="hidden" name="serviceId" value={service.id} />
                  <select name="status" defaultValue={service.moderationStatus} className="input text-xs">
                    <option value="PENDING">Pending</option>
                    <option value="APPROVED">Approved</option>
                    <option value="NEEDS_CHANGES">Needs changes</option>
                    <option value="REJECTED">Rejected</option>
                  </select>
                  <input name="moderationNote" defaultValue={service.moderationNote ?? ""} placeholder="Admin note" className="input text-xs" />
                  <button type="submit" className="btn btn-primary w-full text-sm">Save status</button>
                </form>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </main>
  );
}

function Metric({ label, value, tone }: { label: string; value: number; tone: "accent" | "success" | "danger" }) {
  return <Card className="p-5"><Badge variant={tone}>{tone === "success" ? <CheckCircle2 size={14} /> : <ShieldAlert size={14} />} {label}</Badge><p className="mt-4 text-3xl font-black tracking-[-0.05em]">{value}</p></Card>;
}
