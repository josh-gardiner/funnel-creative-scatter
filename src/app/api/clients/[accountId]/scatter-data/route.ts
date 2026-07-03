import { NextRequest, NextResponse } from "next/server";
import { clientByAccountId } from "@/lib/clients";
import { buildScatterData } from "@/lib/scatter";
import type { WindowDays } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function parseWindow(value: string | null): WindowDays {
  const n = Number(value);
  return n === 7 || n === 30 ? n : 14;
}

// GET /api/clients/[accountId]/scatter-data?window=7|14|30 → processed dataset.
export async function GET(
  req: NextRequest,
  { params }: { params: { accountId: string } }
) {
  const { accountId } = params;
  const client = clientByAccountId(accountId);
  const window = parseWindow(req.nextUrl.searchParams.get("window"));

  try {
    const data = await buildScatterData(
      accountId,
      client?.accountName ?? accountId,
      window
    );
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to build scatter data", detail: message },
      { status: 502 }
    );
  }
}
