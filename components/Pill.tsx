// components/Pill.tsx
import { type ComponentProps } from "react";

export function Pill({ className = "", ...props }: ComponentProps<"span">) {
  const base =
    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs border-gray-200 bg-gray-50 text-gray-700";
  return <span className={`${base} ${className}`.trim()} {...props} />;
}
