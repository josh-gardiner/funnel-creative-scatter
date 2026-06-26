import { NextResponse } from "next/server";
import { CLIENTS } from "@/lib/clients";

export const dynamic = "force-dynamic";

// GET /api/clients → the configured client tabs (no secrets exposed).
export async function GET() {
  return NextResponse.json({
    clients: CLIENTS.map(({ slug, label, accountId, accountName }) => ({
      slug,
      label,
      accountId,
      accountName,
    })),
  });
}
