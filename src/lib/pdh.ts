// Server-side client for the SSW Platforms Data Hub (PDH).
// The API key is read from the environment and never sent to the browser.
// Only import this from route handlers / server components — never client code.

const BASE_URL = "https://platforms-data-hub.onrender.com";
const PAGE_SIZE = 200;
const MAX_PAGES = 100; // safety backstop against runaway pagination

function apiKey(): string {
  const key = process.env.PDH_API_KEY;
  if (!key) {
    throw new Error(
      "PDH_API_KEY is not set. Add it to .env.local (see .env.example)."
    );
  }
  return key;
}

// --- Raw response shapes (only the fields we consume) ---

export interface PdhAccount {
  id: string;
  name: string;
  platform: string;
  platformId: string;
  isActive: boolean;
}

export interface PdhAd {
  id: string;
  name: string;
  adSetId: string;
  status: string;
}

export interface PdhAdSet {
  id: string;
  name: string;
  campaignId: string;
}

export interface PdhCampaign {
  id: string;
  name: string;
}

export interface PdhMetricRow {
  entityId: string;
  spend: string | number;
  impressions: string | number;
  platformMetrics?: {
    reach?: string | number;
    frequency?: string | number;
  };
}

interface PdhEnvelope<T> {
  data: T[];
  meta?: { count?: number; page?: number; page_size?: number; as_of?: string };
}

async function pdhGet<T>(
  path: string,
  params: Record<string, string | number>
): Promise<PdhEnvelope<T>> {
  const url = new URL(BASE_URL + path);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v));
  }
  const res = await fetch(url.toString(), {
    headers: { "X-API-Key": apiKey() },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `PDH ${path} failed: ${res.status} ${res.statusText}${
        body ? ` — ${body.slice(0, 200)}` : ""
      }`
    );
  }
  return (await res.json()) as PdhEnvelope<T>;
}

/**
 * Page through a PDH list endpoint until a short page is returned.
 * For metrics, pass `useAsOf` so the first response's `meta.as_of` is echoed
 * on subsequent pages to keep the snapshot consistent.
 */
async function paginate<T>(
  path: string,
  baseParams: Record<string, string | number>,
  opts: { useAsOf?: boolean } = {}
): Promise<T[]> {
  const out: T[] = [];
  let page = 1;
  let asOf: string | undefined;

  while (page <= MAX_PAGES) {
    const params: Record<string, string | number> = {
      ...baseParams,
      page,
      page_size: PAGE_SIZE,
    };
    if (opts.useAsOf && asOf) params.as_of = asOf;

    const json = await pdhGet<T>(path, params);
    const data = json.data ?? [];
    out.push(...data);

    if (opts.useAsOf && !asOf && json.meta?.as_of) asOf = json.meta.as_of;
    if (data.length < PAGE_SIZE) break;
    page += 1;
  }
  return out;
}

export async function fetchAccounts(): Promise<PdhAccount[]> {
  return paginate<PdhAccount>("/v1/accounts", { platform: "meta" });
}

export async function fetchAds(accountId: string): Promise<PdhAd[]> {
  return paginate<PdhAd>("/v1/ads", {
    account_id: accountId,
    platform: "meta",
  });
}

export async function fetchAdSets(accountId: string): Promise<PdhAdSet[]> {
  return paginate<PdhAdSet>("/v1/ad-sets", {
    account_id: accountId,
    platform: "meta",
  });
}

export async function fetchCampaigns(accountId: string): Promise<PdhCampaign[]> {
  return paginate<PdhCampaign>("/v1/campaigns", {
    account_id: accountId,
    platform: "meta",
  });
}

export async function fetchAdMetrics(
  accountId: string,
  dateFrom: string,
  dateTo: string
): Promise<PdhMetricRow[]> {
  return paginate<PdhMetricRow>(
    "/v1/metrics",
    {
      account_id: accountId,
      platform: "meta",
      entity_type: "ad",
      date_from: dateFrom,
      date_to: dateTo,
      fields: "entity_id,spend,impressions,platform_metrics",
    },
    { useAsOf: true }
  );
}
