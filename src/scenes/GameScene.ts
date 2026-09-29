import Phaser from "phaser";
import { getWordCategory, WORD_BANK } from "../words";
import { PauseMenu } from "./game/PauseMenu";
import { getLaneX, pickLaneNotSame, type Lane } from "./game/lanes";
import { WaterEffects, WATER_TEXTURE_KEY } from "./game/WaterEffects";
import { WordTarget } from "./game/WordTarget";
import type { MatchConfig } from "../lib/mockData";

export type GameResult = {
  score: number;
  wpm: number;
  accuracy: number;
  errorRate: number;
  completedWords: number;
  remainingLives: number;
  endReason: "time" | "health";
  mode: string;
  difficulty: string;
  roundTime: number;
  wordSet: string;
};

type GameSceneInitData = {
  matchConfig: MatchConfig;
  onGameOver: (result: GameResult) => void;
};

export default class GameScene extends Phaser.Scene {
  private static readonly DIFFICULTY_CONFIG = {
    easy: { fallSpeed: 55, minimumLength: 1, maximumLength: 4 },
    normal: { fallSpeed: 75, minimumLength: 5, maximumLength: 7 },
    hard: { fallSpeed: 105, minimumLength: 6, maximumLength: Number.POSITIVE_INFINITY },
  } as const;

  private readonly WATER_FRAME_SIZE = 1000;
  private readonly WATER_LAST_FRAME = 3;
  private matchDurationSeconds = 60;

  // === TUNING ===
  private readonly WORD_FONT_SIZE = 22;
  private readonly TYPED_FONT_SIZE = 22;
  private readonly TILE_HEIGHT = 52;
  private readonly TILE_PADDING_X = 50;
  private fallSpeedPxPerSec: number = GameScene.DIFFICULTY_CONFIG.normal.fallSpeed;
  // ==============

  private typedDisplay!: Phaser.GameObjects.Text;
  private hudText!: Phaser.GameObjects.Text;
  private gameOverDisplay!: Phaser.GameObjects.Text;
  private pauseMenu!: PauseMenu;
  private wordTarget!: WordTarget;
  private waterEffects!: WaterEffects;
  private matchConfig!: MatchConfig;
  private onGameOver!: (result: GameResult) => void;

  private activeWord = "";
  private typedText = "";
  private score = 0;
  private remainingSeconds = 60;
  private elapsedSeconds = 0;
  private completedWords = 0;
  private correctKeystrokes = 0;
  private incorrectKeystrokes = 0;
  private completedCharacters = 0;
  private lives = 3;
  private difficultyKey: keyof typeof GameScene.DIFFICULTY_CONFIG = "normal";
  private wordCategory = "general" as keyof typeof WORD_BANK;
  private endReason: "time" | "health" = "time";
  private gameOver = false;
  private wordX = 0;
  private wordY = 60;
  private lastLane: Lane = "center";

  constructor() {
    super("GameScene");
  }

  init({ matchConfig, onGameOver }: GameSceneInitData): void {
    this.matchConfig = matchConfig;
    this.onGameOver = onGameOver;
    this.matchDurationSeconds = matchConfig.roundTime;
    this.remainingSeconds = this.matchDurationSeconds;
    this.difficultyKey = this.getDifficultyKey(matchConfig.difficulty);
    this.wordCategory = getWordCategory(matchConfig.wordSet);
    this.fallSpeedPxPerSec = GameScene.DIFFICULTY_CONFIG[this.difficultyKey].fallSpeed;
  }

  preload(): void {
    // Background gif is rendered by CSS so it stays animated.
    this.load.spritesheet(WATER_TEXTURE_KEY, new URL("../assets/waterdrop.jpg", import.meta.url).href, {
      frameWidth: this.WATER_FRAME_SIZE,
      frameHeight: this.WATER_FRAME_SIZE,
    });
  }

  create(): void {
    this.hudText = this.add
      .text(12, 12, "", {
        fontFamily: "monospace",
        fontSize: "16px",
        color: "#ffffff",
        backgroundColor: "rgba(0,0,0,0.35)",
        padding: { x: 10, y: 6 },
      })
      .setDepth(10);

    this.typedDisplay = this.add
      .text(this.scale.width / 2, this.scale.height - 80, "", {
        fontFamily: "monospace",
        fontSize: `${this.TYPED_FONT_SIZE}px`,
        color: "#ffff00",
        backgroundColor: "rgba(0,0,0,0.75)",
        padding: { x: 10, y: 5 },
      })
      .setOrigin(0.5)
      .setDepth(10);

    this.gameOverDisplay = this.add
      .text(this.scale.width / 2, this.scale.height / 2, "", {
        fontFamily: "monospace",
        fontSize: "24px",
        color: "#ffffff",
        backgroundColor: "rgba(0,0,0,0.85)",
        align: "center",
        padding: { x: 24, y: 18 },
      })
      .setOrigin(0.5)
      .setDepth(100)
      .setVisible(false);

    this.pauseMenu = new PauseMenu(this);
    this.waterEffects = new WaterEffects(this, this.WATER_LAST_FRAME);
    this.waterEffects.ensureAnimations();

    this.wordTarget = new WordTarget(this, {
      wordFontSize: this.WORD_FONT_SIZE,
      tileHeight: this.TILE_HEIGHT,
      tilePaddingX: this.TILE_PADDING_X,
    });

    this.spawnWord();
    this.updateHud();

    this.input.keyboard?.on("keydown", (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        this.pauseMenu.toggle();
        return;
      }

      this.handleTyping(event.key);
    });

    this.scale.on("resize", (gameSize: Phaser.Structs.Size) => {
      this.typedDisplay.setPosition(gameSize.width / 2, gameSize.height - 80);
      this.gameOverDisplay.setPosition(gameSize.width / 2, gameSize.height / 2);
      this.pauseMenu.layout(gameSize.width, gameSize.height);

      this.wordX = getLaneX(gameSize.width, this.lastLane);
      this.wordTarget.setPosition(this.wordX, this.wordY);
    });
  }

  update(_: number, delta: number): void {
    if (this.pauseMenu.isPaused || this.gameOver) return;

    const dt = delta / 1000;
    this.elapsedSeconds = Math.min(this.matchDurationSeconds, this.elapsedSeconds + dt);
    this.remainingSeconds = Math.max(0, this.matchDurationSeconds - this.elapsedSeconds);
    this.updateHud();

    if (this.remainingSeconds <= 0) {
      this.endMatch();
      return;
    }

    this.wordY += this.fallSpeedPxPerSec * dt;
    this.wordTarget.setPosition(this.wordX, this.wordY);

    const bottomLimit = this.scale.height - 120;
    if (this.wordY >= bottomLimit) {
      this.onMissBottom();
    }
  }

  private spawnWord(): void {
    const difficulty = GameScene.DIFFICULTY_CONFIG[this.difficultyKey];
    const categoryWords = WORD_BANK[this.wordCategory];
    const candidates = categoryWords.filter(
      (word) => word.length >= difficulty.minimumLength && word.length <= difficulty.maximumLength,
    );
    const wordPool = candidates.length > 0 ? candidates : categoryWords;
    const index = Phaser.Math.Between(0, wordPool.length - 1);
    this.activeWord = wordPool[index];

    this.typedText = "";
    this.typedDisplay.setText("");
    this.typedDisplay.setColor("#ffff00");

    this.wordY = 60;

    const lane = pickLaneNotSame(this.lastLane);
    this.lastLane = lane;
    this.wordX = getLaneX(this.scale.width, lane);

    this.wordTarget.setWord(this.activeWord, this.wordX, this.wordY);
  }

  private handleTyping(key: string): void {
    if (this.pauseMenu.isPaused || this.gameOver) return;

    if (key === "Backspace") {
      if (this.typedText.length > 0) {
        this.typedText = this.typedText.slice(0, -1);
        this.typedDisplay.setText(this.typedText);
        this.refreshWordSplit();
      }
      return;
    }

    const specialKeys = [
      "Shift",
      "Control",
      "Alt",
      "Meta",
      "CapsLock",
      "Tab",
      "Enter",
      "Escape",
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
    ];
    if (specialKeys.includes(key)) return;
    if (key.length !== 1) return;

    this.waterEffects.shoot(this.typedDisplay.x, this.typedDisplay.y - 8, this.wordX, this.wordY);

    this.typedText += key;
    this.typedDisplay.setText(this.typedText);

    if (this.activeWord.toLowerCase().startsWith(this.typedText.toLowerCase())) {
      this.correctKeystrokes += 1;
      this.typedDisplay.setColor("#00ff00");
      this.refreshWordSplit();

      if (this.typedText.toLowerCase() === this.activeWord.toLowerCase()) {
        this.waterEffects.playSplash(this.wordX, this.wordY, 22);

        this.score += 10;
        this.completedWords += 1;
        this.completedCharacters += this.activeWord.length;
        this.updateHud();
        this.spawnWord();
      }
    } else {
      this.onWrongKey();
    }
  }

  private refreshWordSplit(): void {
    this.wordTarget.setTypedText(this.typedText);

    if (this.typedText.length === 0) {
      this.typedDisplay.setColor("#ffff00");
    }
  }

  private onWrongKey(): void {
    this.incorrectKeystrokes += 1;
    this.score -= 2;
    this.updateHud();

    this.cameras.main.shake(80, 0.003);

    this.typedText = "";
    this.typedDisplay.setText("");
    this.typedDisplay.setColor("#ffff00");
    this.wordTarget.resetToFullWord();
  }

  private onMissBottom(): void {
    this.lives = Math.max(0, this.lives - 1);
    this.score -= 5;
    if (this.lives === 0) {
      this.endReason = "health";
      this.updateHud();
      this.endMatch();
      return;
    }

    this.updateHud();

    this.cameras.main.shake(120, 0.004);
    this.spawnWord();
  }

  private updateHud(): void {
    const elapsedMinutes = this.elapsedSeconds / 60;
    const wpm = elapsedMinutes > 0 ? this.completedCharacters / 5 / elapsedMinutes : 0;
    const totalKeystrokes = this.correctKeystrokes + this.incorrectKeystrokes;
    const accuracy = totalKeystrokes > 0 ? (this.correctKeystrokes / totalKeystrokes) * 100 : 0;
    const errorRate = totalKeystrokes > 0 ? (this.incorrectKeystrokes / totalKeystrokes) * 100 : 0;

    this.hudText.setText(
      `Lives: ${this.lives}  Score: ${this.score}  Time: ${Math.ceil(this.remainingSeconds)}  WPM: ${wpm.toFixed(1)}\nAccuracy: ${accuracy.toFixed(1)}%  Error Rate: ${errorRate.toFixed(1)}%  Difficulty: ${this.difficultyKey.toUpperCase()}`,
    );
  }

  private endMatch(): void {
    this.gameOver = true;
    const elapsedMinutes = this.elapsedSeconds / 60;
    const wpm = elapsedMinutes > 0 ? this.completedCharacters / 5 / elapsedMinutes : 0;
    const totalKeystrokes = this.correctKeystrokes + this.incorrectKeystrokes;
    const accuracy = totalKeystrokes > 0 ? (this.correctKeystrokes / totalKeystrokes) * 100 : 0;
    const errorRate = totalKeystrokes > 0 ? (this.incorrectKeystrokes / totalKeystrokes) * 100 : 0;

    this.onGameOver({
      score: this.score,
      wpm,
      accuracy,
      errorRate,
      completedWords: this.completedWords,
      remainingLives: this.lives,
      endReason: this.endReason,
      mode: this.matchConfig.mode,
      difficulty: this.matchConfig.difficulty,
      roundTime: this.matchConfig.roundTime,
      wordSet: this.matchConfig.wordSet,
    });

    this.gameOverDisplay
      .setText(
        `GAME OVER\n\nReason: ${this.endReason === "health" ? "Health depleted" : "Time expired"}\nScore: ${this.score}\nWPM: ${wpm.toFixed(1)}\nAccuracy: ${accuracy.toFixed(1)}%\nError Rate: ${errorRate.toFixed(1)}%\nCompleted words: ${this.completedWords}\nLives: ${this.lives}`,
      )
      .setVisible(true);
  }

  private getDifficultyKey(difficulty: string): keyof typeof GameScene.DIFFICULTY_CONFIG {
    const normalizedDifficulty = difficulty.toLowerCase();
    if (normalizedDifficulty === "easy" || normalizedDifficulty === "hard" || normalizedDifficulty === "extreme") {
      return normalizedDifficulty === "easy" ? "easy" : "hard";
    }
    return "normal";
  }
}