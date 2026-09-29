export type WordCategory = "corporate" | "communication" | "records" | "accounting" | "technology" | "general";

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
};

export const WORDS: string[] = Object.values(WORD_BANK).flat();

export function getWordCategory(value: string): WordCategory {
  const normalized = value.toLowerCase().replace(/[^a-z]/g, "");
  if (normalized === "corporate") return "corporate";
  if (normalized === "communication" || normalized === "communicate") return "communication";
  if (normalized === "records") return "records";
  if (normalized === "accounting") return "accounting";
  if (normalized === "technology") return "technology";
  return "general";
}