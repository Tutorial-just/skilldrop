import type { HTMLAttributes, ReactNode } from "react";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  soft?: boolean;
};

export function Card({ children, className = "", soft = false, ...props }: CardProps) {
  return (
    <div
      className={[
        soft ? "card-soft" : "card",
        "rounded-[28px] border border-[var(--border)] shadow-[var(--shadow-sm)]",
        "transition duration-200",
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </div>
  );
}