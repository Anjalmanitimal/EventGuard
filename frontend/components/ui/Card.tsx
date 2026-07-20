import type { HTMLAttributes } from "react";

export default function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-2xl border border-border bg-surface p-8 shadow-sm shadow-black/[0.03] ${className}`}
      {...props}
    />
  );
}
