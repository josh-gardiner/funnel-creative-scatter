export function ErrorPanel({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-bof/40 bg-bof/10 p-6">
      <h2 className="text-sm font-semibold text-bof">
        Couldn&apos;t load this account
      </h2>
      <p className="mt-2 text-sm text-[#c7d2e3]">
        The Platforms Data Hub request failed. Try refreshing — the API can be
        slow to wake up on the first request.
      </p>
      <pre className="mt-3 overflow-x-auto rounded-lg bg-black/30 p-3 text-xs text-[#8fa0bd]">
        {message}
      </pre>
    </div>
  );
}
