"use client";

import Link from "next/link";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="container-page flex min-h-[calc(100vh-72px)] items-center py-16">
      <section className="mx-auto max-w-3xl text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#fff3e8] text-3xl">
          ⚠️
        </div>

        <p className="mt-8 text-sm font-black text-[#f97316]">
          Something went wrong
        </p>

        <h1 className="mt-4 text-balance text-5xl font-black tracking-tight md:text-6xl">
          We hit a temporary problem.
        </h1>

        <p className="mx-auto mt-5 max-w-xl text-lg leading-8 text-[#6f6a63]">
          Try again or go back to the marketplace. If this keeps happening, we
          will improve the error handling in the next product phase.
        </p>

        {error?.message ? (
          <div className="mt-6 rounded-[1.5rem] bg-[#f7f4ef] p-4 text-left">
            <p className="text-xs font-black text-[#6f6a63]">Developer info</p>
            <p className="mt-2 break-words text-sm text-[#151515]">
              {error.message}
            </p>
          </div>
        ) : null}

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            onClick={reset}
            className="rounded-full bg-[#2563eb] px-7 py-4 text-sm font-black text-white transition hover:bg-[#1d4ed8]"
          >
            Try again
          </button>

          <Link
            href="/experts"
            className="rounded-full border border-[#e8e1d8] bg-white px-7 py-4 text-sm font-black text-[#151515] transition hover:bg-[#f7f4ef]"
          >
            Find experts
          </Link>
        </div>
      </section>
    </main>
  );
}