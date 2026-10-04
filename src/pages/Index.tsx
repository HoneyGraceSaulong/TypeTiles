import { useEffect, useState } from "react";
import { CheckCheck, Star, Zap, type LucideIcon } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { mockMatchConfig } from "../lib/mockData";
import { usePlayerAuth } from "../lib/PlayerAuthContext";
import { getPlayerHistory, getPlayerRank, type MatchHistoryRow, type PlayerStats } from "../lib/playerApi";
import { getProfileAvatar, getProfileBackground } from "../lib/profileAssets";

const assetRoot = "/figma/type-tiles-home";

const categories = [
  { label: "CORPORATE", image: `${assetRoot}/image4.png`, dimmed: true },
  { label: "COMMUNICATION", image: `${assetRoot}/image5.png` },
  { label: "RECORDS", image: `${assetRoot}/image6.png`, dimmed: true },
  { label: "ACCOUNTING", image: `${assetRoot}/image7.png`, dimmed: true },
  { label: "TECHNOLOGY", image: `${assetRoot}/image8.png`, dimmed: true },
  { label: "GENERAL", solid: true },
  { label: "STENOGRAPHY", solid: true },
] as const;

const difficultyOptions = ["Easy", "Normal", "Hard"] as const;

type CategoryLabel = (typeof categories)[number]["label"];
type DifficultyLabel = (typeof difficultyOptions)[number];

function HomeStatIcon({ icon: Icon, alt }: { icon: LucideIcon; alt: string }) {
  return <Icon aria-label={alt} className="h-[26px] w-[26px] shrink-0 text-sky-500" />;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, stats: restoredStats } = usePlayerAuth();
  const [dashboardStats, setDashboardStats] = useState<PlayerStats | null>(restoredStats);
  const [latestMatch, setLatestMatch] = useState<MatchHistoryRow | null>(null);
  const [rank, setRank] = useState<number | null>(null);
  const [statsError, setStatsError] = useState("");

  useEffect(() => {
    Promise.all([getPlayerRank(), getPlayerHistory()])
      .then(([rankResponse, historyResponse]) => {
        setDashboardStats(rankResponse.stats);
        setRank(rankResponse.rank);
        setLatestMatch(historyResponse.history[0] ?? null);
      })
      .catch((error) => setStatsError(error instanceof Error ? error.message : "Unable to load stats"));
  }, []);

  const statItems = [
    { icon: Zap, label: "Best WPM", value: dashboardStats ? dashboardStats.best_wpm.toFixed(1) : "...", valueClassName: "text-white" },
    { icon: CheckCheck, label: "Accuracy", value: dashboardStats ? `${dashboardStats.avg_accuracy.toFixed(1)}%` : "...", valueClassName: "text-emerald-400" },
    { icon: Star, label: "Max Combo", value: dashboardStats ? String(dashboardStats.top_combo) : "...", valueClassName: "text-amber-300" },
  ] as const;
  const [selectedCategory, setSelectedCategory] = useState<CategoryLabel | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyLabel>("Normal");

  const openProfileModal = () => {
    navigate("/app/customize");
  };

  const handleStartFromCategory = () => {
    if (!selectedCategory) return;

    navigate("/app/pre-match", {
      state: {
        matchConfig: {
          ...mockMatchConfig,
          wordSet: selectedCategory,
          mode: "Solo Practice",
          difficulty: selectedDifficulty,
          opponents: [],
        },
      },
    });
  };

  return (
    <section className="h-full overflow-y-auto pb-4">
      <h1 className="px-1 text-[1.95rem] font-semibold tracking-[-0.03em] text-white sm:text-[2.15rem]">Welcome to Type Tiles!</h1>

      <article
        className="mt-4 rounded-[10px] border border-[#3d3d3d]/70 bg-[#c3d9ed] bg-cover bg-center px-4 py-3 text-slate-900 shadow-[0_20px_50px_rgba(5,8,24,0.35)]"
        style={{ backgroundImage: `linear-gradient(rgba(195,217,237,.84), rgba(195,217,237,.84)), url(${getProfileBackground(user?.background).source})` }}
      >
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="h-[84px] w-[88px] shrink-0 overflow-hidden rounded-[9px] bg-[#4186c0]">
                <img alt={`${getProfileAvatar(user?.avatar).label} avatar`} className="h-full w-full object-cover object-[center_top]" src={getProfileAvatar(user?.avatar).source} />
              </div>

              <div className="min-w-0 flex-1">
                <div className="text-[0.7rem] uppercase tracking-[0.16em] text-[#3d3d3d]">Player</div>
                <div className="mt-1 truncate text-[1.85rem] font-semibold leading-none tracking-[-0.03em] text-black">{user?.displayName || user?.username || "Player"}</div>
                <div className="mt-3 text-[0.68rem] uppercase tracking-[0.12em] text-[#3d3d3d]">
                  {rank !== null ? `Rank # ${rank} Global` : "Rank unavailable"}
                </div>
              </div>

              <div className="hidden min-w-[180px] shrink-0 text-right sm:block">
                <button
                  type="button"
                  onClick={openProfileModal}
                  className="mt-3 w-[180px] rounded-[7px] bg-[#1a2045] py-2 text-sm text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition hover:brightness-110"
                >
                  Edit Profile
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={openProfileModal}
              className="mt-3 w-full rounded-[7px] bg-[#1a2045] px-4 py-2 text-sm text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition hover:brightness-110 sm:hidden"
            >
              Edit Profile
            </button>
      </article>

      <div className="mt-4 grid gap-4 lg:grid-cols-[321px_minmax(0,1fr)] xl:gap-[35px]">
        <div className="space-y-4">
          <article className="rounded-[10px] border border-[#2967a1] bg-[#1d234a] p-4 shadow-[0_16px_30px_rgba(4,8,25,0.35)]">
            <div className="space-y-4">
              {statItems.map((item) => (
                <div key={item.label} className="grid grid-cols-[28px_1fr_auto] items-center gap-3">
                  <HomeStatIcon alt={item.label} icon={item.icon} />
                  <div className="text-[1.05rem] font-medium text-white">{item.label}</div>
                  <div className={`text-[1.35rem] font-semibold tracking-[-0.04em] ${item.valueClassName}`}>{item.value}</div>
                </div>
              ))}
            </div>
            {statsError ? <div className="mt-3 text-xs text-amber-300">{statsError}</div> : null}
          </article>

          <article className="relative overflow-hidden rounded-[10px] border border-[#2967a1] bg-[#1a2349] p-4 shadow-[0_16px_30px_rgba(4,8,25,0.35)]">
            <div className="text-[1.1rem] font-medium text-white">Last Transmission</div>
            {latestMatch ? <>
              <div className="mt-2 flex items-end gap-3">
                <div className="text-[3rem] font-semibold leading-none tracking-[-0.06em] text-white">{latestMatch.wpm.toFixed(1)}</div>
                <div className="pb-1 text-sm uppercase tracking-[0.16em] text-white/90">WPM</div>
              </div>
              <div className="mt-3 text-[0.75rem] uppercase tracking-[0.18em] text-white/90">
                {latestMatch.mode} <span className="mx-2 text-white/55">{new Date(latestMatch.created_at).toLocaleDateString()}</span>
              </div>
            </> : <div className="mt-3 text-sm text-white/70">No completed matches yet.</div>}
            <img alt="" className="pointer-events-none absolute -bottom-2 right-1 h-[74px] w-[98px] opacity-70" src={`${assetRoot}/cloud9.png`} />
            <img alt="" className="pointer-events-none absolute -bottom-2 right-6 h-[80px] w-[74px] opacity-90" src={`${assetRoot}/cloud10.png`} />
          </article>
        </div>

        <div className="space-y-4">
          <div className="flex justify-start">
            <Link
              to="/app/play"
              className="inline-flex min-w-[158px] items-center justify-center rounded-[8px] border border-[#bde9ff] bg-[#7357f1] px-6 py-3 text-[1rem] font-medium text-white shadow-[0_14px_30px_rgba(80,63,220,0.35)] transition hover:brightness-110"
            >
              Start Game
            </Link>
          </div>

          <div className="pr-1">
            <div className="grid gap-[10px] sm:grid-cols-2 xl:grid-cols-3">
            {categories.map((category) => (
              <button
                type="button"
                key={category.label}
                onClick={() => {
                  setSelectedCategory(category.label);
                  setSelectedDifficulty("Normal");
                }}
                className="relative aspect-[4/3] overflow-hidden rounded-[8px] border-2 border-[#1183bb] bg-[#1a2349] text-left shadow-[0_16px_30px_rgba(4,8,25,0.35)] transition hover:scale-[1.01] hover:border-sky-300 xl:aspect-[1/1]"
              >
                {"solid" in category ? (
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(70,62,191,0.95)_0%,rgba(47,35,149,0.95)_100%)]" />
                ) : (
                  <img alt="" className={`absolute inset-0 h-full w-full object-cover ${"dimmed" in category ? "opacity-60" : ""}`} src={category.image} />
                )}
                {"dimmed" in category && !("solid" in category) ? <div className="absolute inset-0 bg-black/25" /> : null}
                {category.label !== "GENERAL" ? <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/10" /> : null}

                <div className="absolute inset-0 flex items-center justify-center px-4 text-center">
                  <div className="max-w-full font-['Concert_One'] text-[1.8rem] leading-none tracking-[0.04em] text-white drop-shadow-[0_4px_10px_rgba(0,0,0,0.35)] sm:text-[1.95rem]">
                    {category.label}
                  </div>
                </div>

              </button>
            ))}
            </div>
          </div>
        </div>
      </div>

      {selectedCategory ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-[476px] overflow-hidden rounded-[8px] border border-[#5da3c5] bg-[#13173b] shadow-[0_24px_60px_rgba(0,0,0,0.55)]">
            <div className="h-[116px] w-full overflow-hidden">
              <img alt="Category header" className="h-full w-full object-cover" src={`${assetRoot}/image5.png`} />
            </div>

            <div className="px-7 py-6">
              <div className="flex items-center gap-3 text-white/90">
                <div className="h-px flex-1 bg-white/70" />
                <span className="font-['Roboto'] text-[1.85rem] font-bold tracking-[0.03em]">CATEGORY</span>
                <div className="h-px flex-1 bg-white/70" />
              </div>

              <div className="mt-4 flex justify-center">
                <div className="rounded-[8px] border-2 border-[#5da3c5] bg-white px-10 py-[3px] font-['Roboto'] text-[1.55rem] font-bold text-[#0898dd]">
                  {selectedCategory.charAt(0) + selectedCategory.slice(1).toLowerCase()}
                </div>
              </div>

              <div className="mt-6 flex items-center gap-3 text-white/90">
                <div className="h-px flex-1 bg-white/70" />
                <span className="font-['Roboto'] text-[1.85rem] font-bold tracking-[0.03em]">DIFFICULTY</span>
                <div className="h-px flex-1 bg-white/70" />
              </div>

              <div className="mt-5 grid grid-cols-3 gap-3">
                {difficultyOptions.map((difficulty) => (
                  <button
                    key={difficulty}
                    type="button"
                    onClick={() => setSelectedDifficulty(difficulty)}
                    className={`rounded-[8px] border px-2 py-2 text-lg font-bold transition ${selectedDifficulty === difficulty ? "border-[#5da3c5] bg-[#0898dd] text-white" : "border-white bg-white text-[#0898dd]"}`}
                  >
                    {difficulty}
                  </button>
                ))}
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedCategory(null)}
                  className="rounded-[8px] border border-white/30 bg-white/10 px-5 py-2 text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleStartFromCategory}
                  className="rounded-[8px] border border-[#5da3c5] bg-white px-5 py-2 font-bold text-[#0898dd]"
                >
                  Start Game
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}