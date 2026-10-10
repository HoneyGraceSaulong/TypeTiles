import { STENO_EXERCISES, type StenoExercise } from "./stenoExercises";

export type SoloGreggPrompt = {
  readonly id: string;
  readonly exerciseNumber: StenoExercise["exerciseNumber"];
  readonly answer: string;
  readonly image: string;
};

// All exercises remain in learning order, independent of gameplay difficulty.
export const SOLO_GREGG_PROMPTS: readonly SoloGreggPrompt[] = Object.freeze(
  STENO_EXERCISES.map((exercise) => Object.freeze({
    id: exercise.id,
    exerciseNumber: exercise.exerciseNumber,
    answer: exercise.sentence,
    image: exercise.imagePath,
  })),
);

export function getSoloGreggPrompts(): readonly SoloGreggPrompt[] {
  return SOLO_GREGG_PROMPTS;
}

// Recognition only: callers must also require runtime mode === "solo".
export function isGreggStenographyCategory(category: string): boolean {
  const normalized = category.trim().toLowerCase().replace(/[\s\p{P}]+/gu, "");
  return normalized === "stenography" || normalized === "steno" || normalized === "greggshorthand";
}
