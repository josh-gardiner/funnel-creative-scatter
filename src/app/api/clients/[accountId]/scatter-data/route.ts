import { NextRequest, NextResponse } from "next/server";
import { clientByAccountId } from "@/lib/clients";
import { buildScatterData } from "@/lib/scatter";

export const dynamic = "force-dynamic";

// GET /api/clients/[accountId]/scatter-data → processed scatter dataset.
export async function GET(
  _req: NextRequest,
  { params }: { params: { accountId: string } }
) {
  const { accountId } = params;
  const client = clientByAccountId(accountId);

  try {
    const data = await buildScatterData(
      accountId,
      client?.accountName ?? accountId
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
