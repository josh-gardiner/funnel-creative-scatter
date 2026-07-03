import { NextRequest, NextResponse } from "next/server";
import { CLIENTS } from "@/lib/clients";
import { buildScatterData } from "@/lib/scatter";
import type { WindowDays } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // warming many combos takes minutes

const WINDOWS: WindowDays[] = [7, 14, 30];
const COMBO_CONCURRENCY = 3;

// GET /api/prewarm — populates the 24h cache for every account × window so live
// Meta reach is fetched by this job (once/day via cron) instead of on page view.
// Secured with CRON_SECRET when set (Vercel cron sends it as a Bearer token).
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const combos = CLIENTS.flatMap((c) =>
    WINDOWS.map((w) => ({ client: c, window: w }))
  );

  const results: Array<{ slug: string; window: number; ok: boolean }> = [];
  let cursor = 0;
  async function worker() {
    while (cursor < combos.length) {
      const { client, window } = combos[cursor++];
      try {
        await buildScatterData(client.accountId, client.label, window);
        results.push({ slug: client.slug, window, ok: true });
      } catch {
        results.push({ slug: client.slug, window, ok: false });
      }
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(COMBO_CONCURRENCY, combos.length) }, worker)
  );

  const warmed = results.filter((r) => r.ok).length;
  return NextResponse.json({ warmed, total: combos.length, results });
}
