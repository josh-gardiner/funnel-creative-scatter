"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { WindowDays } from "@/lib/types";

const WINDOWS: WindowDays[] = [7, 14, 30];

export function WindowToggle({ active }: { active: WindowDays }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function select(w: WindowDays) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("window", String(w));
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="inline-flex rounded-lg border border-border bg-card p-0.5">
      {WINDOWS.map((w) => {
        const isActive = w === active;
        return (
          <button
            key={w}
            type="button"
            onClick={() => select(w)}
            aria-pressed={isActive}
            className={[
              "rounded-md px-3 py-1 text-xs font-medium transition-colors",
              isActive
                ? "bg-white/10 text-white ring-1 ring-white/25"
                : "text-[#8fa0bd] hover:text-white",
            ].join(" ")}
          >
            {w}d
          </button>
        );
      })}
    </div>
  );
}
