import Phaser from "phaser";
import { useEffect, useRef } from "react";
import MatchHudScene from "../scenes/match_hud";
import type { MatchConfig } from "../lib/mockData";
import type { GamePerformance, GameResult } from "../scenes/GameScene";

type Props = {
  mode?: "solo" | "multiplayer";
  roomCode?: string;
  matchConfig: MatchConfig;
  onGameOver: (result: GameResult) => void;
  onPerformance?: (performance: GamePerformance) => void;
  wordSequence?: string[];
  startAt?: number;
};

export function GameMount({ mode = "solo", roomCode, matchConfig, onGameOver, onPerformance, wordSequence, startAt }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const onGameOverRef = useRef(onGameOver);
  const onPerformanceRef = useRef(onPerformance);

  useEffect(() => {
    onGameOverRef.current = onGameOver;
  }, [onGameOver]);

  useEffect(() => {
    onPerformanceRef.current = onPerformance;
  }, [onPerformance]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    // Create the Phaser game without automatically starting a scene.
    // We start GameScene manually below so we can pass matchConfig to it.
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: host,
      transparent: true,
      backgroundColor: "#000000",
      width: host.clientWidth,
      height: host.clientHeight,
      scene: [],
      scale: {
        mode: Phaser.Scale.RESIZE,
      },
      render: {
        antialias: true,
        pixelArt: false,
      },
    });

    // Add and start the Phaser scene.
    // matchConfig is passed to GameScene.init().
    game.scene.add("GameScene", MatchHudScene, true, {
      mode,
      roomCode,
      matchConfig,
      onGameOver: (result: GameResult) => onGameOverRef.current(result),
      onPerformance: (performance: GamePerformance) => onPerformanceRef.current?.(performance),
      wordSequence,
      startAt,
    });

    // Keep the Phaser canvas responsive when the window changes size.
    const resize = () => {
      game.scale.resize(host.clientWidth, host.clientHeight);
    };

    window.addEventListener("resize", resize);

    // Clean up Phaser and the event listener when leaving the game page.
    return () => {
      window.removeEventListener("resize", resize);
      game.destroy(true);
    };
  }, [matchConfig, mode, roomCode, startAt, wordSequence]);

  return (
    <div className="relative min-h-0 flex-1 overflow-hidden rounded-[2rem] border border-white/10 bg-black/30">
      <div className="absolute left-4 top-4 z-10 rounded-2xl border border-emerald-400/30 bg-black/50 px-4 py-3 text-xs uppercase tracking-[0.25em] text-emerald-200">
        Match Config: {matchConfig.mode} / {matchConfig.difficulty} /{" "}
        {matchConfig.roundTime}s / {matchConfig.wordSet}
      </div>

      <div
        ref={hostRef}
        className="game-stage h-full min-h-0 w-full"
      />
    </div>
  );
}