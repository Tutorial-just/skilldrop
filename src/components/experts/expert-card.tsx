type ExpertCardProps = {
  expert: {
    id: string;
    headline: string;
    isVerified: boolean;
    user: {
      name: string | null;
    };
    services: {
      priceCents: number;
    }[];
  };
};

export function ExpertCard({ expert }: ExpertCardProps) {
  const minPrice = expert.services.length
    ? Math.min(...expert.services.map((service) => service.priceCents)) / 100
    : 0;

  return (
    <a
      href={`/experts/${expert.id}`}
      className="block rounded-2xl border p-6 transition hover:shadow"
    >
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-semibold">{expert.user.name ?? "Expert"}</h2>

        {expert.isVerified ? (
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700">
            ✔ Verified
          </span>
        ) : null}
      </div>

      <p className="mt-2 text-sm text-gray-600">{expert.headline}</p>

      <p className="mt-4 text-sm font-medium">
        {minPrice > 0 ? `From €${minPrice}` : "Price not set"}
      </p>
    </a>
  );
}