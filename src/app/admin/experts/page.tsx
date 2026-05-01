import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  approveExpertAction,
  rejectExpertAction,
  setExpertPendingAction,
  verifyExpertAction,
  unverifyExpertAction,
} from "@/server/actions/admin.actions";

export default async function AdminExpertsPage() {
  const experts = await prisma.expertProfile.findMany({
    include: {
      user: true,
      services: {
        orderBy: {
          priceCents: "asc",
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const pendingCount = experts.filter(
    (expert) => expert.status === "PENDING",
  ).length;

  const approvedCount = experts.filter(
    (expert) => expert.status === "APPROVED",
  ).length;

  const rejectedCount = experts.filter(
    (expert) => expert.status === "REJECTED",
  ).length;

  const verifiedCount = experts.filter((expert) => expert.isVerified).length;

  return (
    <main className="container-page py-10">
      <section className="rounded-[2rem] bg-[#151515] p-6 text-white sm:rounded-[2.5rem] md:p-10">
        <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-black text-[#f97316]">
              Admin moderation
            </p>

            <h1 className="mt-4 text-4xl font-black tracking-tight md:text-5xl">
              Expert applications
            </h1>

            <p className="mt-4 max-w-2xl text-lg leading-8 text-white/60">
              Review expert profiles, approve trusted experts, verify profiles
              and reject weak applications before they appear in the marketplace.
            </p>
          </div>

          <Link
            href="/experts"
            className="rounded-full bg-white px-6 py-3 text-center text-sm font-black text-[#151515] transition hover:bg-[#f7f4ef]"
          >
            View marketplace
          </Link>
        </div>

        <div className="mt-8 grid gap-3 md:grid-cols-5">
          <AdminStat label="Total experts" value={`${experts.length}`} />
          <AdminStat label="Pending" value={`${pendingCount}`} />
          <AdminStat label="Approved" value={`${approvedCount}`} />
          <AdminStat label="Rejected" value={`${rejectedCount}`} />
          <AdminStat label="Verified" value={`${verifiedCount}`} />
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h2 className="text-2xl font-black">All expert profiles</h2>
            <p className="mt-1 text-sm text-[#6f6a63]">
              Approve experts to make them visible. Verify experts after manual
              trust review.
            </p>
          </div>

          <div className="rounded-full border border-[#e8e1d8] bg-white px-4 py-2 text-sm font-bold text-[#6f6a63]">
            Manual review mode
          </div>
        </div>

        {experts.length === 0 ? (
          <EmptyExperts />
        ) : (
          <div className="space-y-5">
            {experts.map((expert) => (
              <article key={expert.id} className="card rounded-[2rem] p-6">
                <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
                  <div>
                    <div className="flex items-start gap-4">
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#f97316] text-2xl font-black text-white">
                        {expert.user.name?.charAt(0) ?? "E"}
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-xl font-black">
                            {expert.user.name}
                          </h3>

                          <StatusBadge status={expert.status} />

                          {expert.isVerified ? (
                            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-black text-green-700">
                              VERIFIED
                            </span>
                          ) : (
                            <span className="rounded-full bg-[#f7f4ef] px-3 py-1 text-xs font-black text-[#6f6a63]">
                              NOT VERIFIED
                            </span>
                          )}
                        </div>

                        <p className="mt-1 text-sm font-bold text-[#6f6a63]">
                          {expert.user.email}
                        </p>

                        <p className="mt-3 max-w-2xl text-lg font-black">
                          {expert.headline}
                        </p>

                        <p className="mt-3 max-w-3xl leading-7 text-[#6f6a63]">
                          {expert.bio}
                        </p>

                        {expert.verificationNote ? (
                          <div className="mt-4 rounded-[1.25rem] bg-green-50 p-4">
                            <p className="text-xs font-black text-green-700">
                              Verification note
                            </p>
                            <p className="mt-1 text-sm leading-6 text-green-800">
                              {expert.verificationNote}
                            </p>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-6 grid gap-4 md:grid-cols-3">
                      <MiniInfo label="Country" value={expert.country ?? "—"} />
                      <MiniInfo label="Timezone" value={expert.timezone} />
                      <MiniInfo
                        label="Sessions"
                        value={`${expert.totalSessions}`}
                      />
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2">
                      {expert.skills.map((skill) => (
                        <span
                          key={skill}
                          className="rounded-full bg-[#eef4ff] px-3 py-1 text-xs font-black text-[#2563eb]"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {expert.languages.map((language) => (
                        <span
                          key={language}
                          className="rounded-full bg-[#f7f4ef] px-3 py-1 text-xs font-bold text-[#6f6a63]"
                        >
                          {language}
                        </span>
                      ))}
                    </div>
                  </div>

                  <aside>
                    <div className="rounded-[1.75rem] bg-[#f7f4ef] p-5">
                      <p className="text-sm font-black text-[#f97316]">
                        Services
                      </p>

                      <div className="mt-4 space-y-3">
                        {expert.services.length === 0 ? (
                          <p className="text-sm text-[#6f6a63]">
                            No services yet.
                          </p>
                        ) : (
                          expert.services.map((service) => (
                            <div
                              key={service.id}
                              className="rounded-[1.25rem] bg-white p-4"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="font-black">{service.title}</p>
                                  <p className="mt-1 text-xs leading-5 text-[#6f6a63]">
                                    {service.durationMinutes} min
                                  </p>
                                </div>

                                <p className="font-black text-[#2563eb]">
                                  €{service.priceCents / 100}
                                </p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="mt-4 grid gap-2">
                      {expert.status !== "APPROVED" ? (
                        <form action={approveExpertAction}>
                          <input
                            type="hidden"
                            name="expertId"
                            value={expert.id}
                          />
                          <button
                            type="submit"
                            className="w-full rounded-full bg-[#2563eb] px-5 py-3 text-sm font-black text-white transition hover:bg-[#1d4ed8]"
                          >
                            Approve expert
                          </button>
                        </form>
                      ) : null}

                      {expert.status !== "REJECTED" ? (
                        <form action={rejectExpertAction}>
                          <input
                            type="hidden"
                            name="expertId"
                            value={expert.id}
                          />
                          <button
                            type="submit"
                            className="w-full rounded-full bg-[#151515] px-5 py-3 text-sm font-black text-white transition hover:bg-black"
                          >
                            Reject expert
                          </button>
                        </form>
                      ) : null}

                      {expert.status !== "PENDING" ? (
                        <form action={setExpertPendingAction}>
                          <input
                            type="hidden"
                            name="expertId"
                            value={expert.id}
                          />
                          <button
                            type="submit"
                            className="w-full rounded-full border border-[#e8e1d8] bg-white px-5 py-3 text-sm font-black text-[#151515] transition hover:bg-[#f7f4ef]"
                          >
                            Move to pending
                          </button>
                        </form>
                      ) : null}

                      {expert.isVerified ? (
                        <form action={unverifyExpertAction}>
                          <input
                            type="hidden"
                            name="expertId"
                            value={expert.id}
                          />
                          <button
                            type="submit"
                            className="w-full rounded-full border border-[#e8e1d8] bg-white px-5 py-3 text-sm font-black text-[#151515] transition hover:bg-[#f7f4ef]"
                          >
                            Remove verification
                          </button>
                        </form>
                      ) : (
                        <form action={verifyExpertAction}>
                          <input
                            type="hidden"
                            name="expertId"
                            value={expert.id}
                          />
                          <button
                            type="submit"
                            className="w-full rounded-full bg-green-600 px-5 py-3 text-sm font-black text-white transition hover:bg-green-700"
                          >
                            Verify expert
                          </button>
                        </form>
                      )}

                      {expert.status === "APPROVED" ? (
                        <Link
                          href={`/experts/${expert.id}`}
                          className="w-full rounded-full border border-[#e8e1d8] bg-white px-5 py-3 text-center text-sm font-black text-[#151515] transition hover:bg-[#f7f4ef]"
                        >
                          View public profile
                        </Link>
                      ) : null}
                    </div>
                  </aside>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function AdminStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.5rem] bg-white/10 p-5">
      <p className="text-sm text-white/45">{label}</p>
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PENDING: "bg-[#fff3e8] text-[#f97316]",
    APPROVED: "bg-[#eef4ff] text-[#2563eb]",
    REJECTED: "bg-red-100 text-red-700",
    SUSPENDED: "bg-[#f7f4ef] text-[#6f6a63]",
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-black ${
        styles[status] ?? "bg-[#f7f4ef] text-[#6f6a63]"
      }`}
    >
      {status}
    </span>
  );
}

function MiniInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.25rem] bg-[#f7f4ef] p-4">
      <p className="text-xs font-bold text-[#6f6a63]">{label}</p>
      <p className="mt-1 truncate text-sm font-black">{value}</p>
    </div>
  );
}

function EmptyExperts() {
  return (
    <div className="card rounded-[2rem] p-10 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#eef4ff] text-2xl">
        🧑‍💼
      </div>

      <h3 className="mt-5 text-2xl font-black">No experts yet</h3>

      <p className="mx-auto mt-3 max-w-md leading-7 text-[#6f6a63]">
        Expert applications will appear here after someone submits the Become
        Expert form.
      </p>

      <Link
        href="/become-expert"
        className="mt-6 inline-flex rounded-full bg-[#2563eb] px-6 py-3 text-sm font-black text-white transition hover:bg-[#1d4ed8]"
      >
        Go to application form
      </Link>
    </div>
  );
}