import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CalendarDays, CheckCircle2, ExternalLink, FileText, Repeat, UserRound } from "lucide-react";

import { requireRole } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default async function BuyerBookingOutcomePage({ params }: { params: Promise<{ id: string }> }) {
  const { user } = await requireRole(["buyer", "admin"]);
  const { id } = await params;
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { buyer: true, expert: { include: { user: true } }, service: true, outcome: true },
  });
  if (!booking) notFound();
  if (booking.buyerId !== user.id && user.role !== "ADMIN") redirect("/buyer/bookings");
  if (!booking.outcome || !booking.outcome.isVisibleToBuyer) {
    return <main className="container-page py-10"><Link href="/buyer/bookings" className="inline-flex items-center gap-2 text-sm font-bold text-[var(--primary-dark)]"><ArrowLeft size={16} />Back to bookings</Link><Card className="mt-8 p-8 text-center"><Badge variant="accent">Not ready</Badge><h1 className="mt-5 text-3xl font-black tracking-[-0.05em]">No action plan yet</h1><p className="mx-auto mt-3 max-w-md text-sm font-medium leading-6 text-[var(--muted-foreground)]">Your helper has not published an action plan for this call yet.</p><div className="mt-6"><ButtonLink href="/buyer/bookings">Back to bookings</ButtonLink></div></Card></main>;
  }
  const outcome = booking.outcome;
  return <main><section className="relative overflow-hidden border-b border-[var(--border)]"><div className="surface-grid absolute inset-0 opacity-40" /><div className="container-page relative py-8 md:py-10 lg:py-12"><Link href="/buyer/outcomes" className="inline-flex items-center gap-2 text-sm font-bold text-[var(--primary-dark)]"><ArrowLeft size={16} />Back to action plans</Link><Badge variant="success" className="mt-8"><CheckCircle2 size={14} />Action plan ready</Badge><h1 className="heading-lg mt-5 max-w-4xl text-balance">Your next steps.</h1><p className="mt-4 max-w-2xl text-lg leading-8 text-[var(--muted-foreground)]">For: {booking.service?.title ?? "Completed call"} · Helper: {booking.expert.user.name ?? booking.expert.user.email}</p></div></section><section className="container-page py-8 md:py-10 lg:py-12"><div className="grid gap-6 xl:grid-cols-[1fr_360px] xl:items-start"><div className="grid gap-6"><OutcomeSection title="Problem summary" text={outcome.problemSummary} /><OutcomeSection title="What was discussed" text={outcome.discussionNotes || "No discussion notes were added."} muted={!outcome.discussionNotes} /><OutcomeSection title="Next steps" text={outcome.nextSteps} important />{outcome.usefulLinks.length > 0 ? <Card className="p-5 md:p-6"><Badge variant="primary"><ExternalLink size={14} />Useful links</Badge><div className="mt-5 grid gap-3">{outcome.usefulLinks.map((link) => <a key={link} href={link} target="_blank" rel="noreferrer" className="rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] p-3 text-sm font-bold text-[var(--primary-dark)] break-all hover:border-[var(--border-strong)]">{link}</a>)}</div></Card> : null}</div><aside className="grid gap-6 xl:sticky xl:top-[96px]"><Card className="p-5 md:p-6"><Badge variant="primary"><FileText size={14} />Call info</Badge><div className="mt-5 grid gap-3"><Info label="Date" value={formatDate(booking.startTime)} /><Info label="Duration" value={`${Math.round((booking.endTime.getTime()-booking.startTime.getTime())/60000)} min`} /><Info label="Helper" value={booking.expert.user.name ?? booking.expert.user.email} /></div></Card>{outcome.followUpRecommended ? <Card className="border-[var(--accent)]/20 bg-[var(--accent-soft)] p-5 md:p-6"><Badge variant="accent"><Repeat size={14} />Follow-up recommended</Badge><p className="mt-4 text-sm font-bold leading-6 text-[var(--muted-foreground)]">{outcome.followUpNote || "Your helper recommends booking a follow-up session."}</p><div className="mt-5"><ButtonLink href={`/experts/${booking.expertId}`} variant="secondary">Book follow-up</ButtonLink></div></Card> : null}</aside></div></section></main>;
}
function OutcomeSection({ title, text, important = false, muted = false }: { title: string; text: string; important?: boolean; muted?: boolean }) { return <Card className={important ? "border-[var(--success)]/20 bg-[var(--success-soft)] p-5 md:p-6" : "p-5 md:p-6"}><Badge variant={important ? "success" : "primary"}>{title}</Badge><p className={muted ? "mt-5 whitespace-pre-wrap text-sm font-medium leading-7 text-[var(--muted-foreground)]" : "mt-5 whitespace-pre-wrap text-base font-medium leading-8 text-[var(--muted-foreground)]"}>{text}</p></Card>; }
function Info({ label, value }: { label: string; value: string }) { return <div className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] p-3"><p className="text-sm font-medium text-[var(--muted-foreground)]">{label}</p><p className="text-right text-sm font-bold text-[var(--foreground)]">{value}</p></div>; }
function formatDate(date: Date) { return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(date); }

