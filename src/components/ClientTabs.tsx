"use client";

import Link from "next/link";
import { CLIENTS } from "@/lib/clients";

export function ClientTabs({ activeSlug }: { activeSlug: string }) {
  return (
    <nav className="flex flex-wrap gap-2 border-b border-border pb-3">
      {CLIENTS.map((c) => {
        const active = c.slug === activeSlug;
        return (
          <Link
            key={c.slug}
            href={`/clients/${c.slug}`}
            prefetch
            aria-current={active ? "page" : undefined}
            className={[
              "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-tof/15 text-white ring-1 ring-tof/40"
                : "text-[#8fa0bd] hover:bg-card hover:text-white",
            ].join(" ")}
          >
            {c.label}
          </Link>
        );
      })}
    </nav>
  );
}
