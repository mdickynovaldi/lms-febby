import type { Question, QuestionOption } from "@/lib/types/assessment";

export function gradeMultipleChoice(
  question: Question,
  options: QuestionOption[],
  selectedOptionId: string
): { isCorrect: boolean; score: number } {
  const correct = options.find((o) => o.isCorrect);
  const isCorrect = !!correct && correct.id === selectedOptionId;
  const score = isCorrect ? question.points : 0;
  return { isCorrect, score };
}

export function computeFinalScore(
  questionScores: number[],
  totalWeight: number
): { raw: number; final: number } {
  const raw = questionScores.reduce((a, b) => a + b, 0);
  const maxPossible =
    raw === 0 && questionScores.length > 0
      ? questionScores.length // avoid 0 division; treat as all 1s
      : undefined;
  if (maxPossible) {
    return { raw, final: 0 };
  }
  // final will be scaled later when total points known on server
  return { raw, final: raw };
}

