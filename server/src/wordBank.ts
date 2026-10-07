export type WordCategory = "corporate" | "communication" | "records" | "accounting" | "technology" | "general" | "stenography";

export type GreggPrompt = {
  id: string;
  answer: string;
  image: string;
  difficulty: "Easy" | "Normal" | "Hard";
};

export const WORD_BANK: Record<WordCategory, string[]> = {
  corporate: [
    "team", "goal", "plan", "staff", "client", "office", "budget", "career", "report", "policy", "project", "meeting",
    "company", "manager", "workflow", "deadline", "strategy", "training", "resource", "planning", "proposal", "business",
  ],
  communication: [
    "talk", "call", "chat", "note", "tone", "reply", "email", "listen", "message", "contact", "dialogue", "speaker",
    "feedback", "meeting", "clarify", "channel", "response", "briefing", "question", "announce", "conversation", "statement",
  ],
  records: [
    "log", "file", "date", "name", "code", "form", "data", "entry", "index", "label", "record", "folder",
    "archive", "history", "source", "version", "storage", "catalog", "document", "register", "database", "reference",
  ],
  accounting: [
    "tax", "cash", "cost", "sale", "rate", "loan", "fund", "audit", "asset", "credit", "debit", "invoice",
    "income", "profit", "ledger", "balance", "payment", "expense", "account", "payable", "revenue", "forecast",
  ],
  technology: [
    "app", "code", "data", "file", "node", "web", "chip", "cloud", "debug", "server", "binary", "script",
    "system", "network", "kernel", "packet", "device", "browser", "runtime", "storage", "protocol", "database",
  ],
  general: [
    "cat", "dog", "tree", "type", "key", "true", "nice", "wait", "sound", "busy", "program", "framework",
    "bright", "garden", "summer", "window", "simple", "travel", "market", "picture", "weather", "practice",
  ],
  stenography: [],
};

// Verified Gregg shorthand assets and prompt mappings must be supplied before gameplay is enabled.
export const GREGG_PROMPTS: GreggPrompt[] = [];

export const WORD_CATEGORIES = Object.keys(WORD_BANK) as WordCategory[];

export function getWordCategory(value: string): WordCategory {
  const normalized = value.toLowerCase().replace(/[^a-z]/g, "");
  if (normalized === "corporate") return "corporate";
  if (normalized === "communication" || normalized === "communicate") return "communication";
  if (normalized === "records") return "records";
  if (normalized === "accounting") return "accounting";
  if (normalized === "technology") return "technology";
  if (normalized === "steno " || normalized === "greggshorthand") return "stenography";
  return "general";
}

export function getDifficultyKey(difficulty: string): "easy" | "normal" | "hard" | null {
  const normalized = difficulty.toLowerCase();
  if (normalized === "easy") return "easy";
  if (normalized === "normal") return "normal";
  if (normalized === "hard" || normalized === "extreme") return "hard";
  return null;
}

export const DIFFICULTY_WORD_LENGTHS = {
  easy: { minimumLength: 1, maximumLength: 4 },
  normal: { minimumLength: 5, maximumLength: 7 },
  hard: { minimumLength: 6, maximumLength: Number.POSITIVE_INFINITY },
} as const;

export function getWordsForDifficulty(category: WordCategory, difficulty: "easy" | "normal" | "hard"): string[] {
  if (category === "stenography") {
    return GREGG_PROMPTS
      .filter((prompt) => prompt.difficulty.toLowerCase() === difficulty)
      .map((prompt) => prompt.answer);
  }

  const range = DIFFICULTY_WORD_LENGTHS[difficulty];
  const categoryWords = WORD_BANK[category];
  const filtered = categoryWords.filter((word) => word.length >= range.minimumLength && word.length <= range.maximumLength);
  return filtered.length > 0 ? filtered : categoryWords;
}
