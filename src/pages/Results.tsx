import { Link, useLocation } from "react-router-dom";
import type { GameResult } from "../scenes/GameScene";

type ResultState = {
  result?: GameResult;
  persistenceStatus?: "saved" | "error";
};

export default function Results() {
  const location = useLocation();
  const state = location.state as ResultState | null;
  const result = state?.result;

  return (
    <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
      <article className="hud-panel rounded-[2rem] p-6">
        <div className="text-xs uppercase tracking-[0.35em] text-emerald-300">Match Result</div>
        <h1 className="mt-2 text-4xl font-semibold text-white">Session Complete</h1>
        {result ? (
          <div className="mt-5 space-y-3">
            {[
              ["Score", String(result.score)],
              ["WPM", result.wpm.toFixed(1)],
              ["Accuracy", `${result.accuracy.toFixed(1)}%`],
              ["Error Rate", `${result.errorRate.toFixed(1)}%`],
              ["Completed Words", String(result.completedWords)],
              ["End Reason", result.endReason === "health" ? "Health depleted" : "Time expired"],
              ["Difficulty", result.difficulty],
              ["Category", result.wordSet],
              ["Round Time", `${result.roundTime}s`],
              ["Remaining Lives", String(result.remainingLives)],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white">
                <span className="text-slate-400">{label}</span>
                <span>{value}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-5 text-slate-400">No session result is available.</p>
        )}
        {state?.persistenceStatus === "saved" ? <div className="mt-4 text-sm text-emerald-300">Match saved.</div> : null}
        {state?.persistenceStatus === "error" ? <div className="mt-4 text-sm text-amber-300">Match result could not be saved.</div> : null}
        <div className="mt-5 flex flex-wrap gap-3">
          <Link to="/app/play" className="rounded-full bg-emerald-400 px-4 py-3 font-semibold text-slate-950">Play Again</Link>
          <Link to="/app" className="rounded-full border border-white/10 bg-white/5 px-4 py-3 text-white">Dashboard</Link>
        </div>
      </article>
    </section>
  );
}
