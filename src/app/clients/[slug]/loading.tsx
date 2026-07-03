// Shown during the first (cold) load of an account+window and on window switches.
export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6">
      <div className="mb-6">
        <div className="h-6 w-64 rounded bg-card" />
        <div className="mt-2 h-4 w-96 max-w-full rounded bg-card/70" />
      </div>

      <div className="flex gap-2 border-b border-border pb-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-8 w-24 rounded-lg bg-card" />
        ))}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-16 rounded-xl bg-card" />
        ))}
      </div>

      <div className="mt-8 space-y-4">
        <div className="h-10 w-72 max-w-full rounded bg-card/70" />
        <div className="h-[360px] rounded-xl bg-card" />
      </div>

      <p className="mt-6 animate-pulse text-center text-xs text-[#5f6d85]">
        Pulling live reach from Meta (first load can take ~15–30s; cached after).
      </p>
    </main>
  );
}
