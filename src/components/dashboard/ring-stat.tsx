type RingStatProps = {
  label: string;
  value: number;
  suffix?: string;
  description?: string;
  tone?: "blue" | "green" | "orange" | "dark";
};

export function RingStat({
  label,
  value,
  suffix = "%",
  description,
  tone = "blue",
}: RingStatProps) {
  const normalizedValue = Math.max(0, Math.min(value, 100));

  const tones = {
    blue: {
      ring: "#2563eb",
      bg: "#eef4ff",
      text: "#2563eb",
    },
    green: {
      ring: "#16a34a",
      bg: "#dcfce7",
      text: "#15803d",
    },
    orange: {
      ring: "#f97316",
      bg: "#fff3e8",
      text: "#f97316",
    },
    dark: {
      ring: "#151515",
      bg: "#f7f4ef",
      text: "#151515",
    },
  };

  const currentTone = tones[tone];

  return (
    <div className="card rounded-[2rem] p-6">
      <div className="flex items-center gap-5">
        <div
          className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full"
          style={{
            background: `conic-gradient(${currentTone.ring} ${
              normalizedValue * 3.6
            }deg, ${currentTone.bg} 0deg)`,
          }}
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white">
            <span
              className="text-lg font-black"
              style={{ color: currentTone.text }}
            >
              {value}
              {suffix}
            </span>
          </div>
        </div>

        <div>
          <p className="text-lg font-black">{label}</p>

          {description ? (
            <p className="mt-2 text-sm leading-6 text-[#6f6a63]">
              {description}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}