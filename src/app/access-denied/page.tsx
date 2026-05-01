import Link from "next/link";
import { signOutAction } from "@/server/actions/auth.actions";

type AccessDeniedPageProps = {
  searchParams?: Promise<{
    next?: string;
    current?: string;
    required?: string;
  }>;
};

export default async function AccessDeniedPage({
  searchParams,
}: AccessDeniedPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};

  const next = resolvedSearchParams.next ?? "/";
  const current = resolvedSearchParams.current ?? "Unknown";
  const required = resolvedSearchParams.required ?? "another role";

  return (
    <main className="container-page flex min-h-[calc(100vh-120px)] items-center py-12">
      <section className="mx-auto grid w-full max-w-5xl gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[2.5rem] bg-[#151515] p-8 text-white md:p-10">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#fff3e8] text-4xl">
            🔒
          </div>

          <p className="mt-8 text-sm font-black text-[#f97316]">
            Access denied
          </p>

          <h1 className="mt-4 text-5xl font-black tracking-tight">
            This area requires a different role.
          </h1>

          <p className="mt-5 text-lg leading-8 text-white/60">
            Your current role does not have permission to open this page. Switch
            role or return to the public marketplace.
          </p>
        </div>

        <div className="card rounded-[2.5rem] p-6 md:p-8">
          <p className="text-sm font-black text-[#2563eb]">
            Permission details
          </p>

          <h2 className="mt-3 text-3xl font-black tracking-tight">
            Role mismatch
          </h2>

          <div className="mt-6 space-y-3 rounded-[1.5rem] bg-[#f7f4ef] p-5">
            <SummaryRow label="Current role" value={current} />
            <SummaryRow label="Required role" value={required} />
            <SummaryRow label="Requested page" value={next} />
          </div>

          <div className="mt-6 rounded-[1.5rem] bg-[#eef4ff] p-5">
            <p className="font-black text-[#2563eb]">What to do next?</p>
            <p className="mt-2 text-sm leading-6 text-[#6f6a63]">
              Sign out and sign in again with the correct role. Admin pages
              require Admin access. Expert pages require Expert or Admin access.
            </p>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <form action={signOutAction}>
              <button
                type="submit"
                className="w-full rounded-full bg-[#2563eb] px-6 py-3 text-sm font-black text-white transition hover:bg-[#1d4ed8]"
              >
                Sign out
              </button>
            </form>

            <Link
              href="/experts"
              className="rounded-full bg-[#151515] px-6 py-3 text-center text-sm font-black text-white transition hover:bg-black"
            >
              Browse experts
            </Link>
          </div>

          <Link
            href="/"
            className="mt-3 block rounded-full border border-[#e8e1d8] bg-white px-6 py-3 text-center text-sm font-black text-[#151515] transition hover:bg-[#f7f4ef]"
          >
            Back home
          </Link>
        </div>
      </section>
    </main>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[#e8e1d8] pb-3 last:border-0 last:pb-0">
      <span className="text-sm text-[#6f6a63]">{label}</span>
      <span className="max-w-[220px] break-words text-right text-sm font-black">
        {value}
      </span>
    </div>
  );
}