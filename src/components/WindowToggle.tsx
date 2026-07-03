"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import type { WindowDays } from "@/lib/types";

const WINDOWS: WindowDays[] = [7, 14, 30];

export function WindowToggle({ active }: { active: WindowDays }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  // Optimistic highlight so the click registers instantly even while the new
  // window's data is still loading (a cold load can take ~30s).
  const [pending, setPending] = useState<WindowDays | null>(null);

  useEffect(() => setPending(null), [active]);
  const shown = pending ?? active;

  function select(w: WindowDays) {
    if (w === shown) return;
    setPending(w);
    startTransition(() => router.push(`${pathname}?window=${w}`));
  }

  return (
    <div className="inline-flex items-center gap-2">
      <div className="inline-flex rounded-lg border border-border bg-card p-0.5">
        {WINDOWS.map((w) => {
          const isActive = w === shown;
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
      {isPending && <span className="text-xs text-[#7f8da6]">updating…</span>}
    </div>
  );
}
