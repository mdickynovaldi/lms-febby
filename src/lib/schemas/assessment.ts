import { z } from "zod";

export const questionTypeEnum = z.enum(["multiple_choice", "essay"]);

export const createAssessmentSchema = z.object({
  materialId: z.string().uuid(),
  title: z.string().min(3).max(120),
  description: z.string().max(1000).optional().nullable(),
  timeLimitMinutes: z.number().int().min(0).max(600),
  totalWeight: z.number().int().min(1).max(1000),
});

export const updateAssessmentSchema = createAssessmentSchema.extend({
  id: z.string().uuid(),
});

export const createQuestionSchema = z.object({
  assessmentId: z.string().uuid(),
  type: questionTypeEnum,
  prompt: z.string().min(1).max(2000),
  points: z.number().int().min(1).max(1000),
  options: z
    .array(
      z.object({
        label: z.string().min(1).max(500),
        isCorrect: z.boolean(),
      })
    )
    .optional()
    .refine((opts) => opts === undefined || opts.some((o) => o.isCorrect), {
      message: "Pilihan ganda harus punya minimal satu jawaban benar",
    }),
});

export const updateQuestionSchema = createQuestionSchema.extend({
  id: z.string().uuid(),
});

export const submitAnswersSchema = z.object({
  assessmentId: z.string().uuid(),
  submissionId: z.string().uuid().optional(),
  answers: z.array(
    z.discriminatedUnion("type", [
      z.object({
        type: z.literal("multiple_choice"),
        questionId: z.string().uuid(),
        selectedOptionId: z.string().uuid(),
      }),
      z.object({
        type: z.literal("essay"),
        questionId: z.string().uuid(),
        essayText: z.string().min(1).max(5000),
      }),
    ])
  ),
});

export const gradeEssaySchema = z.object({
  submissionId: z.string().uuid(),
  questionId: z.string().uuid(),
  score: z.number().min(0).max(1000),
  feedback: z.string().max(2000).optional().nullable(),
});

export type CreateAssessmentInput = z.infer<typeof createAssessmentSchema>;
export type UpdateAssessmentInput = z.infer<typeof updateAssessmentSchema>;
export type CreateQuestionInput = z.infer<typeof createQuestionSchema>;
export type UpdateQuestionInput = z.infer<typeof updateQuestionSchema>;
export type SubmitAnswersInput = z.infer<typeof submitAnswersSchema>;
export type GradeEssayInput = z.infer<typeof gradeEssaySchema>;
