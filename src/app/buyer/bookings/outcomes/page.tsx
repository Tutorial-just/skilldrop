import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, CalendarDays, CheckCircle2, FileText, Search, Sparkles } from "lucide-react";

import { requireRole } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default async function BuyerOutcomesPage() {
  const { user } = await requireRole(["buyer", "admin"]);
  const buyer = await prisma.user.findUnique({ where: { id: user.id } });
  if (!buyer) redirect("/sign-in");

  const outcomes = await prisma.callOutcome.findMany({
    where: { buyerId: buyer.id, isVisibleToBuyer: true },
    include: { booking: { include: { service: true } }, expert: { include: { user: true } } },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  return (
    <main>
      <section className="relative overflow-hidden border-b border-[var(--border)]"><div className="surface-grid absolute inset-0 opacity-40" /><div className="container-page relative py-8 md:py-10 lg:py-12">
        <Link href="/buyer/bookings" className="inline-flex items-center gap-2 text-sm font-bold text-[var(--primary-dark)]"><ArrowLeft size={16} />Back to bookings</Link>
        <Badge variant="primary" className="mt-8"><FileText size={14} />My action plans</Badge>
        <h1 className="heading-lg mt-5 max-w-4xl text-balance">Your post-call next steps.</h1>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-[var(--muted-foreground)]">These are the practical outcomes your helpers created after completed SkillDrop calls.</p>
        <div className="mt-8 grid gap-3 md:grid-cols-2"><Metric label="Action plans" value={String(outcomes.length)} /><Metric label="Latest" value={outcomes[0] ? formatDate(outcomes[0].updatedAt) : "—"} /></div>
      </div></section>
      <section className="container-page py-8 md:py-10 lg:py-12"><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{outcomes.length > 0 ? outcomes.map((outcome) => <OutcomeCard key={outcome.id} outcome={outcome} />) : <Empty />}</div></section>
    </main>
  );
}
function OutcomeCard({ outcome }: { outcome: { bookingId: string; problemSummary: string; nextSteps: string; updatedAt: Date; booking: { service: { title: string } | null }; expert: { user: { name: string | null; email: string } } } }) { return <Link href={`/buyer/bookings/${outcome.bookingId}/outcome`} className="group"><Card className="h-full p-5 transition group-hover:-translate-y-0.5 group-hover:shadow-[var(--shadow-md)]"><Badge variant="success"><CheckCircle2 size={14} />Action plan</Badge><h2 className="mt-4 text-2xl font-black tracking-[-0.04em]">{outcome.booking.service?.title ?? "Completed call"}</h2><p className="mt-2 text-sm font-bold text-[var(--muted-foreground)]">With {outcome.expert.user.name ?? outcome.expert.user.email}</p><p className="mt-4 line-clamp-3 text-sm font-medium leading-6 text-[var(--muted-foreground)]">{outcome.problemSummary}</p><p className="mt-4 text-xs font-black text-[var(--primary-dark)]">Updated {formatDate(outcome.updatedAt)}</p></Card></Link>; }
function Metric({ label, value }: { label: string; value: string }) { return <Card soft className="p-4"><p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">{label}</p><p className="mt-2 text-3xl font-black tracking-[-0.05em]">{value}</p></Card>; }
function Empty() { return <Card className="p-8 text-center md:col-span-2 xl:col-span-3"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary-dark)]"><Search size={24} /></div><h2 className="mt-5 text-2xl font-black tracking-[-0.04em]">No action plans yet</h2><p className="mx-auto mt-3 max-w-md text-sm font-medium leading-6 text-[var(--muted-foreground)]">After a completed call, your helper can create a practical action plan for you.</p><div className="mt-5"><ButtonLink href="/experts">Find help<Sparkles size={18} /></ButtonLink></div></Card>; }
function formatDate(date: Date) { return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(date); }

