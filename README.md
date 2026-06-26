# Funnel Creative Scatter

Visualises Meta ad performance for SSW agency clients as a three-level scatter
plot: **CPM Unique Reach (Y)** vs. **Frequency (X)**, dots coloured by each ad's
share of spend within its group. Helps spot TOF/MOF/BOF creative and where
budget is concentrating inside each account.

## Stack

- Next.js 14 (App Router) · TypeScript · Tailwind CSS · Recharts
- No database — all data is fetched live (server-side) from the SSW Platforms
  Data Hub on each request. The 14-day window is dynamic: `today - 14d → today`.

## Clients

| Tab | Meta account | Notes |
|---|---|---|
| RegenHaus | `PPS 2.0` | Also known as "Pivot Pain Solutions" — same account |
| JLG Lawyers | `JLG Lawyers` | |
| OBA | `Orthobiologics Associates Ad Account #1` | |

## Local development

```bash
cp .env.example .env.local   # then paste the real PDH_API_KEY
npm install
npm run dev                  # http://localhost:3000
```

## Environment variables

| Name | Description |
|---|---|
| `PDH_API_KEY` | SSW Platforms Data Hub API key. **Server-side only** — never prefixed with `NEXT_PUBLIC_`, so it is never shipped to the browser. |

## Routes

- `/` → redirects to the first client
- `/clients/[slug]` → dashboard for one client (`regenhaus`, `jlg-lawyers`, `oba`)
- `GET /api/clients` → configured client tabs
- `GET /api/clients/[accountId]/scatter-data` → processed scatter dataset

## Data pipeline

Per account, in parallel: fetch ads, ad-sets, campaigns, and 14-day daily ad
metrics. Metrics are aggregated per ad (`spend`, `impressions`, `reach` summed),
then `frequency = impressions / reach` and `cpmUnique = spend / reach * 1000`.
Ads are joined to ad set → campaign, and spend shares are computed at account,
campaign, and ad-set level. Funnel stage (TOF/MOF/BOF) is computed per chart
relative to that chart's own median frequency and CPM.

> **Reach caveat:** `reach` is summed from daily-deduplicated values, which
> slightly overcounts multi-day unique users. Fine for relative funnel analysis.

## Deploy (Vercel)

1. Push this repo to GitHub and import it in Vercel (framework auto-detected as Next.js).
2. Add the `PDH_API_KEY` environment variable in **Project → Settings → Environment Variables**.
3. Deploy. No build configuration is required.
