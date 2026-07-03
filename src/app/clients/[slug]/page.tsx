import { notFound } from "next/navigation";
import { clientBySlug } from "@/lib/clients";
import { buildScatterData } from "@/lib/scatter";
import { ClientTabs } from "@/components/ClientTabs";
import { Dashboard } from "@/components/Dashboard";
import { ErrorPanel } from "@/components/ErrorPanel";
import type { WindowDays } from "@/lib/types";

// Read the window fresh each request; the data layer supplies a 24h cache.
export const dynamic = "force-dynamic";
// Cold loads fan out to live per-ad reach calls (~30s for large accounts).
export const maxDuration = 60;

function parseWindow(value: string | undefined): WindowDays {
  const n = Number(value);
  return n === 7 || n === 30 ? n : 14;
}

export default async function ClientPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { window?: string };
}) {
  const client = clientBySlug(params.slug);
  if (!client) notFound();

  const window = parseWindow(searchParams.window);

  let content;
  try {
    const data = await buildScatterData(client.accountId, client.label, window);
    content = <Dashboard data={data} />;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    content = <ErrorPanel message={message} />;
  }

  return (
    <main className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6">
      <header className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-white">
          Funnel Creative Scatter
        </h1>
        <p className="mt-1 text-sm text-[#7f8da6]">
          CPM unique reach vs. frequency · coloured by funnel stage (TOF/MOF/BOF)
        </p>
      </header>
      <ClientTabs activeSlug={client.slug} />
      <div className="mt-6">{content}</div>
    </main>
  );
}
