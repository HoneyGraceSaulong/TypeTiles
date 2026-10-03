export {
  DIFFICULTY_WORD_LENGTHS,
  WORD_BANK,
  WORD_CATEGORIES,
  getDifficultyKey,
  getWordCategory,
  getWordsForDifficulty,
} from "../server/src/wordBank";
export type { WordCategory } from "../server/src/wordBank";

import { WORD_BANK } from "../server/src/wordBank";

export const WORDS: string[] = Object.values(WORD_BANK).flat();