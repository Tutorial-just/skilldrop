import type { HTMLAttributes, ReactNode } from "react";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  soft?: boolean;
  interactive?: boolean;
};

export function Card({
  children,
  className = "",
  soft = false,
  interactive = false,
  ...props
}: CardProps) {
  return (
    <div
      className={[
        soft ? "card-soft" : "card",
        interactive ? "interactive" : "",
        "rounded-[28px] border border-[var(--border)] shadow-[var(--shadow-sm)]",
        "transition duration-200 ease-out",
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </div>
  );
}