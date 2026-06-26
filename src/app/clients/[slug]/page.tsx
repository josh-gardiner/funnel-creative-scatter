import { notFound } from "next/navigation";
import { clientBySlug } from "@/lib/clients";
import { buildScatterData } from "@/lib/scatter";
import { ClientTabs } from "@/components/ClientTabs";
import { Dashboard } from "@/components/Dashboard";
import { ErrorPanel } from "@/components/ErrorPanel";

// Always fetch the live "last 14 days" window on each request.
export const dynamic = "force-dynamic";

export default async function ClientPage({
  params,
}: {
  params: { slug: string };
}) {
  const client = clientBySlug(params.slug);
  if (!client) notFound();

  let content;
  try {
    const data = await buildScatterData(client.accountId, client.label);
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
          CPM unique reach vs. frequency · last 14 days · coloured by spend share
        </p>
      </header>
      <ClientTabs activeSlug={client.slug} />
      <div className="mt-6">{content}</div>
    </main>
  );
}
