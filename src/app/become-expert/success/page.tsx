import Link from "next/link";

type SuccessPageProps = {
  searchParams?: Promise<{
    expertId?: string;
  }>;
};

export default async function BecomeExpertSuccessPage({
  searchParams,
}: SuccessPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const expertId = resolvedSearchParams.expertId;

  return (
    <main className="container-page flex min-h-[calc(100vh-72px)] items-center py-16">
      <section className="mx-auto max-w-3xl text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#eef4ff] text-3xl">
          ✅
        </div>

        <p className="mt-8 text-sm font-black text-[#2563eb]">
          Application received
        </p>

        <h1 className="mt-4 text-balance text-5xl font-black tracking-tight md:text-6xl">
          Your expert profile is pending review.
        </h1>

        <p className="mx-auto mt-5 max-w-xl text-lg leading-8 text-[#6f6a63]">
          During the early launch, profiles are reviewed manually before they become bookable.
        </p>

        {expertId ? (
          <div className="mx-auto mt-6 max-w-xl rounded-[1.5rem] bg-[#f7f4ef] p-5 text-left">
            <p className="text-sm font-black text-[#6f6a63]">Expert ID</p>
            <p className="mt-2 break-all text-sm font-bold">{expertId}</p>
          </div>
        ) : null}

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/experts"
            className="rounded-full bg-[#2563eb] px-7 py-4 text-sm font-black text-white transition hover:bg-[#1d4ed8]"
          >
            View marketplace
          </Link>

          <Link
            href="/become-expert"
            className="rounded-full border border-[#e8e1d8] bg-white px-7 py-4 text-sm font-black text-[#151515] transition hover:bg-[#f7f4ef]"
          >
            Back to expert page
          </Link>
        </div>
      </section>
    </main>
  );
}