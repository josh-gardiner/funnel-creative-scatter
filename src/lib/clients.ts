// Client → Meta account mapping.
//
// Resolved against the live PDH /v1/accounts list. Notes:
//  - "Pivot Pain Solutions" and "RegenHaus" both refer to the single Meta
//    account listed as "PPS 2.0", so they collapse into one tab (RegenHaus).
//  - "OBA" maps to "Orthobiologics Associates Ad Account #1".

export interface ClientConfig {
  slug: string;
  label: string;
  accountName: string; // exact PDH account name
  accountId: string; // PDH internal UUID
  aliases?: string[]; // other names this client is known by
}

export const CLIENTS: ClientConfig[] = [
  {
    slug: "regenhaus",
    label: "RegenHaus",
    accountName: "PPS 2.0",
    accountId: "1274cee8-6007-4008-87ca-7fe142d685b5",
    aliases: ["Pivot Pain Solutions", "PPS 2.0"],
  },
  {
    slug: "jlg-lawyers",
    label: "JLG Lawyers",
    accountName: "JLG Lawyers",
    accountId: "413d09cf-95d2-4b05-9a2b-5bc3a3fb1492",
  },
  {
    slug: "oba",
    label: "OBA",
    accountName: "Orthobiologics Associates Ad Account #1",
    accountId: "5c7f607c-b05e-4834-9660-211f5becb3ae",
  },
  {
    slug: "meca",
    label: "MECA",
    accountName: "MECA",
    accountId: "415f857e-e7cc-4eb0-aac1-1b137278d08d",
  },
  {
    slug: "unlocked",
    label: "Unlocked",
    accountName: "Unlocked 2",
    accountId: "2f501616-d0c2-42ff-89ea-fb03a8af7e50",
  },
  {
    slug: "sales-momentum",
    label: "Sales Momentum",
    accountName: "Sales Momentum",
    accountId: "1eafa38f-9788-45bb-a54b-263d9aaf1fad",
  },
];

export const DEFAULT_SLUG = CLIENTS[0].slug;

export function clientBySlug(slug: string): ClientConfig | undefined {
  return CLIENTS.find((c) => c.slug === slug);
}

export function clientByAccountId(accountId: string): ClientConfig | undefined {
  return CLIENTS.find((c) => c.accountId === accountId);
}
