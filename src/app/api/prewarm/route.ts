import { NextRequest, NextResponse } from "next/server";
import { CLIENTS } from "@/lib/clients";
import { buildScatterData } from "@/lib/scatter";
import type { WindowDays } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Hobby cap; one combo (~30s) fits comfortably

const WINDOWS: WindowDays[] = [7, 14, 30];
const COMBO_CONCURRENCY = 3;

function parseWindow(value: string | null): WindowDays {
  const n = Number(value);
  return n === 7 || n === 30 ? n : 14;
}

/**
 * Populates the 24h cache so page views hit warm data instead of cold live pulls.
 *
 * - `?account=<slug>&window=<7|14|30>` warms ONE combo (~30s — fits the free
 *   plan's 60s limit). Point a free external scheduler (e.g. cron-job.org) at
 *   the combos you care about to get zero cold loads without upgrading.
 * - No params warms everything (only completes on Pro's longer timeout).
 *
 * Secured with CRON_SECRET when set (send "Authorization: Bearer <secret>").
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const accountParam = sp.get("account");

  // Single-combo warm — the free-plan-friendly path.
  if (accountParam) {
    const client = CLIENTS.find(
      (c) => c.slug === accountParam || c.accountId === accountParam
    );
    if (!client) {
      return NextResponse.json({ error: "Unknown account" }, { status: 404 });
    }
    const window = parseWindow(sp.get("window"));
    try {
      await buildScatterData(client.accountId, client.label, window);
      return NextResponse.json({ warmed: 1, account: client.slug, window });
    } catch (err) {
      const detail = err instanceof Error ? err.message : "Unknown error";
      return NextResponse.json(
        { error: "Warm failed", account: client.slug, window, detail },
        { status: 502 }
      );
    }
  }

  // Full warm — best-effort; completes within longer (Pro) timeouts.
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
  return NextResponse.json({
    warmed: results.filter((r) => r.ok).length,
    total: combos.length,
    results,
  });
}
