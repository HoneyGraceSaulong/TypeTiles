import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import PlayerAuth from "./components/PlayerAuth";
import { mockMatchConfig } from "./lib/mockData";
import { usePlayerAuth } from "./lib/PlayerAuthContext";
import Achievements from "./pages/Achievements";
import Customize from "./pages/Customize";
import Dashboard from "./pages/Index";
import Loading from "./pages/Loading";
import Welcome from "./pages/Welcome";
import Friends from "./pages/Friends";
import Game from "./pages/Game";
import History from "./pages/History";
import Leaderboard from "./pages/Leaderboard";
import Lobby from "./pages/Lobby";
import Play from "./pages/Play";
import PreMatch from "./pages/PreMatch";
import Results from "./pages/Results";
import Settings, { AboutTypeTiles, AccountSettings, FeedbackPage, HelpSupport, NotificationSettings } from "./pages/Settings";

function GameRoute() {
  const location = useLocation();
  const state = location.state as {
    mode?: "solo" | "multiplayer";
    roomCode?: string;
    hostAddress?: string;
    matchConfig?: typeof mockMatchConfig;
    matchId?: number;
    wordSequence?: string[];
    startAt?: number;
  } | null;

  return (
    <Game
      mode={state?.mode ?? "solo"}
      roomCode={state?.roomCode}
      hostAddress={state?.hostAddress}
      matchConfig={state?.matchConfig ?? mockMatchConfig}
      matchId={state?.matchId}
      wordSequence={state?.wordSequence}
      startAt={state?.startAt}
    />
  );
}

function DashboardRoute() {
  return <Dashboard />;
}

function ProtectedApp() {
  const location = useLocation();
  const { user, isLoading } = usePlayerAuth();

  if (isLoading) {
    return <div className="min-h-screen bg-slate-900 text-white" />;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <AppShell />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Loading />} />
      <Route path="/welcome" element={<Welcome />} />
      <Route path="/login" element={<PlayerAuth />} />
      <Route path="/register" element={<PlayerAuth />} />

      <Route path="/app/*" element={<ProtectedApp />}>
        <Route index element={<DashboardRoute />} />
        <Route path="play" element={<Play />} />
        <Route path="lobby" element={<Lobby />} />
        <Route path="pre-match" element={<PreMatch />} />
        <Route path="game" element={<GameRoute />} />
        <Route path="results" element={<Results />} />
        <Route path="history" element={<History />} />
        <Route path="customize" element={<Customize />} />
        <Route path="leaderboard" element={<Leaderboard />} />
        <Route path="achievements" element={<Achievements />} />
        <Route path="friends" element={<Friends />} />
        <Route path="settings" element={<Settings />} />
        <Route path="settings/account" element={<AccountSettings />} />
        <Route path="settings/notifications" element={<NotificationSettings />} />
        <Route path="settings/help" element={<HelpSupport />} />
        <Route path="settings/about" element={<AboutTypeTiles />} />
        <Route path="settings/feedback" element={<FeedbackPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}