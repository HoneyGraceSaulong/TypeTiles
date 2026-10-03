import { GameMount } from "../components/GameMount";
import type { MatchConfig } from "../lib/mockData";
import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import type { GamePerformance, GameResult } from "../scenes/GameScene";
import { submitPlayerMatchResult } from "../lib/playerApi";
import { PLAYER_TOKEN_KEY } from "../lib/playerApi";

type Props = {
  mode?: "solo" | "multiplayer";
  roomCode?: string;
  hostAddress?: string;
  matchConfig: MatchConfig;
  matchId?: number;
  wordSequence?: string[];
  startAt?: number;
};

export default function Game({ mode = "solo", roomCode, hostAddress, matchConfig, matchId, wordSequence, startAt }: Props) {
  const navigate = useNavigate();
  const submissionStartedRef = useRef(false);
  const socketRef = useRef<WebSocket | null>(null);
  const joinedRoomRef = useRef(false);
  const latestPerformanceRef = useRef<GamePerformance | null>(null);
  const [multiplayerResult, setMultiplayerResult] = useState<GameResult | null>(null);

  useEffect(() => {
    if (mode !== "multiplayer" || !roomCode || !hostAddress) return;

    const socket = new WebSocket(`ws://${hostAddress.replace(/^https?:\/\//, "")}/ws`);
    socketRef.current = socket;
    socket.onopen = () => {
      const token = localStorage.getItem(PLAYER_TOKEN_KEY);
      socket.send(JSON.stringify({ type: "join_room", roomCode, token }));
    };
    socket.onmessage = (event) => {
      const message = JSON.parse(event.data) as { type?: string; message?: string };
      if (message.type === "room_joined") {
        joinedRoomRef.current = true;
        if (latestPerformanceRef.current) {
          socket.send(JSON.stringify({ type: "score_update", roomCode, ...latestPerformanceRef.current }));
        }
      }
      if (message.type === "room_cancelled" || message.type === "room_closed") {
        navigate("/app/lobby", { replace: true, state: { message: message.message || "The classroom is no longer available." } });
      }
    };

    return () => {
      socket.close();
      socketRef.current = null;
      joinedRoomRef.current = false;
    };
  }, [hostAddress, mode, roomCode]);

  const handlePerformance = (performance: GamePerformance) => {
    latestPerformanceRef.current = performance;
    if (socketRef.current?.readyState !== WebSocket.OPEN || !joinedRoomRef.current || !roomCode) return;
    socketRef.current.send(JSON.stringify({ type: "score_update", roomCode, ...performance }));
  };

  const handleGameOver = async (result: GameResult) => {
    if (mode === "multiplayer") {
      setMultiplayerResult(result);
      return;
    }

    if (submissionStartedRef.current) return;
    submissionStartedRef.current = true;

    if (matchId === undefined) {
      navigate("/app/results", { state: { result, persistenceStatus: "error" } });
      return;
    }

    try {
      await submitPlayerMatchResult({
        matchId,
        score: result.score,
        wpm: result.wpm,
        accuracy: result.accuracy,
      });
      navigate("/app/results", { state: { result, persistenceStatus: "saved" } });
    } catch {
      navigate("/app/results", { state: { result, persistenceStatus: "error" } });
    }
  };

  return (
    <section className="relative flex h-full min-h-0 flex-col gap-4">
      <div className="hud-panel rounded-[2rem] px-5 py-4">
        <div className="text-xs uppercase tracking-[0.35em] text-emerald-300">Match</div>
        <div className="mt-2 flex flex-wrap gap-2 text-sm text-slate-300">
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">{matchConfig.mode}</span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">{matchConfig.difficulty}</span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">{matchConfig.roundTime}s</span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">{matchConfig.wordSet}</span>
        </div>
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 gap-4">
        <GameMount
          mode={mode}
          roomCode={roomCode}
          matchConfig={matchConfig}
          wordSequence={wordSequence}
          startAt={startAt}
          onGameOver={handleGameOver}
          onPerformance={handlePerformance}
        />
      </div>
      {multiplayerResult ? <div className="pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-emerald-400/40 bg-black/80 px-6 py-4 text-center text-white"><div className="text-xs uppercase tracking-[0.3em] text-emerald-300">Match Complete</div><div className="mt-2 text-sm">Waiting for other players...</div></div> : null}
    </section>
  );
}