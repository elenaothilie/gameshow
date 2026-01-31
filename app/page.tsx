export default function Home() {
  return (
    <div
      className="min-h-screen bg-slate-950 px-6 py-12 text-white"
      style={{ minHeight: "100vh", padding: "3rem 1.5rem", color: "#f8fafc", backgroundColor: "#0f172a" }}
    >
      <main className="mx-auto flex max-w-4xl flex-col items-center gap-8 text-center">
        <div className="text-xs uppercase tracking-[0.45em] text-cyan-200">
          Jeopardy Round 1
        </div>
        <h1 className="text-5xl font-extrabold text-white">
          High-Gloss Gameshow Buzzer
        </h1>
        <p className="max-w-2xl text-lg text-white/70">
          Host the board on your laptop and let teams join from their phones.
          When buzzing opens, first tap wins.
        </p>
        <div className="flex flex-col gap-4 sm:flex-row">
          <a
            className="rounded-full bg-cyan-500/30 px-8 py-4 text-sm uppercase tracking-widest text-cyan-100 hover:bg-cyan-400/40"
            href="/host"
          >
            Host Screen
          </a>
          <a
            className="rounded-full border border-white/10 px-8 py-4 text-sm uppercase tracking-widest text-white/70 hover:bg-white/10"
            href="/team"
          >
            Team Join
          </a>
        </div>
      </main>
    </div>
  );
}
