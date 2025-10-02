export type Id = string;

export type UserRole = "teacher" | "student";

export type QuestionType = "multiple_choice" | "essay";

export interface Assessment {
  id: Id;
  materialId: Id;
  title: string;
  description?: string | null;
  timeLimitMinutes: number; // 0 for no limit
  totalWeight: number; // bobot nilai maksimal (mis. 100)
  createdBy: Id;
  createdAt: string; // ISO
  updatedAt: string; // ISO
}

export interface Question {
  id: Id;
  assessmentId: Id;
  type: QuestionType;
  prompt: string;
  points: number; // skor maksimal untuk soal ini
}

export interface QuestionOption {
  id: Id;
  questionId: Id;
  label: string;
  isCorrect: boolean;
}

export type SubmissionStatus = "in_progress" | "submitted" | "graded";

export interface AssessmentSubmission {
  id: Id;
  assessmentId: Id;
  studentId: Id;
  startedAt: string; // ISO
  submittedAt?: string | null; // ISO
  status: SubmissionStatus;
  scoreRaw?: number | null; // jumlah skor jawaban
  finalScore?: number | null; // skor yang sudah dibobotkan ke totalWeight
  durationSeconds?: number | null;
}

export interface AnswerBase {
  id: Id;
  submissionId: Id;
  questionId: Id;
  score?: number | null;
  feedback?: string | null;
}

export interface MultipleChoiceAnswer extends AnswerBase {
  selectedOptionId: Id;
  isCorrect?: boolean | null;
}

export interface EssayAnswer extends AnswerBase {
  essayText: string;
}

export type Answer = MultipleChoiceAnswer | EssayAnswer;

