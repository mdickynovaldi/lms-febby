"use client";

import { useMemo, useState, useTransition } from "react";
import { Form } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { gradeEssay } from "../actions";
import { type GradeEssayInput } from "@/lib/schemas/assessment";

type Props = {
  submissions: {
    id: string;
    student_id: string;
    student_name: string | null;
    student_nim: string | null;
    status: string;
    final_score: number | null;
    started_at: string | null;
    submitted_at: string | null;
  }[];
  essayAnswers: {
    submission_id: string;
    question_id: string;
    essay_text: string;
    score: number | null;
    feedback: string | null;
  }[];
  questions: { id: string; type: string; prompt: string; points: number }[];
  students: { id: string; name: string | null; nim: string | null }[];
};

export default function GradeClient({
  submissions,
  essayAnswers,
  questions,
  students,
}: Props) {
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const essayQuestions = useMemo(
    () => questions.filter((q) => q.type === "essay"),
    [questions]
  );
  const grouped = useMemo(() => {
    const map = new Map<
      string,
      {
        student: { id: string; name: string | null; nim: string | null };
        answers: Record<
          string,
          { essay_text: string; score: number | null; feedback: string | null }
        >;
      }
    >();
    for (const s of submissions) {
      map.set(s.id, {
        student: {
          id: s.student_id,
          name: s.student_name,
          nim: s.student_nim,
        },
        answers: {},
      });
    }
    for (const a of essayAnswers) {
      const entry = map.get(a.submission_id) ?? {
        student: { id: "", name: null, nim: null },
        answers: {},
      };
      entry.answers[a.question_id] = {
        essay_text: a.essay_text,
        score: a.score,
        feedback: a.feedback,
      };
      map.set(a.submission_id, entry);
    }
    return map;
  }, [submissions, essayAnswers]);

  const filteredEntries = useMemo(() => {
    const entries = [...grouped.entries()];
    if (!selectedStudentId) return entries;
    return entries.filter(([, v]) => v.student.id === selectedStudentId);
  }, [grouped, selectedStudentId]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 items-center">
        <label className="text-sm text-muted-foreground">Filter Siswa:</label>
        <select
          className="h-9 rounded-md border bg-transparent px-3"
          value={selectedStudentId}
          onChange={(e) => setSelectedStudentId(e.target.value)}>
          <option value="">Semua siswa</option>
          {students.map((s) => {
            const label =
              (s.name && s.name.trim() !== "" ? s.name : "Tanpa nama") +
              (s.nim ? ` • ${s.nim}` : "");
            return (
              <option key={s.id} value={s.id}>
                {label}
              </option>
            );
          })}
        </select>
      </div>
      {filteredEntries.map(([submissionId, data]) => (
        <SubmissionCard
          key={submissionId}
          submissionId={submissionId}
          essayQuestions={essayQuestions}
          data={data}
        />
      ))}
      {filteredEntries.length === 0 && (
        <div className="text-sm text-muted-foreground">
          Tidak ada submission.
        </div>
      )}
    </div>
  );
}

function SubmissionCard({
  submissionId,
  essayQuestions,
  data,
}: {
  submissionId: string;
  essayQuestions: { id: string; prompt: string; points: number }[];
  data: {
    student: { id: string; name: string | null; nim: string | null };
    answers: Record<
      string,
      { essay_text: string; score: number | null; feedback: string | null }
    >;
  };
}) {
  const [isPending, startTransition] = useTransition();
  type FormValues = Record<string, { score: number; feedback?: string }>;
  const defaultValues: FormValues = Object.fromEntries(
    essayQuestions.map((q) => [
      q.id,
      {
        score: Number(data.answers[q.id]?.score ?? 0),
        feedback: data.answers[q.id]?.feedback ?? "",
      },
    ])
  ) as FormValues;
  const form = useForm<FormValues>({ defaultValues });

  const onSave = (qid: string) => {
    startTransition(async () => {
      const v = form.getValues()[qid];
      const payload: GradeEssayInput = {
        submissionId,
        questionId: qid,
        score: Number(v?.score ?? 0),
        feedback: v?.feedback,
      };
      const res = await gradeEssay(payload);
      if (!res.success) {
        toast.error(
          typeof res.error === "string" ? res.error : "Gagal menyimpan nilai"
        );
        return;
      }
      toast.success("Nilai disimpan");
    });
  };

  return (
    <div className="p-4 border rounded-md space-y-4">
      <div className="flex items-center justify-between">
        <div className="font-medium">Submission</div>
        <div className="text-sm text-muted-foreground">
          Siswa: {data.student.name ?? "Tanpa nama"}
          {data.student.nim ? ` • nim ${data.student.nim}` : ""}
        </div>
      </div>
      {essayQuestions.length === 0 ? (
        <div className="text-sm text-muted-foreground">
          Tidak ada soal esai.
        </div>
      ) : (
        <Form {...form}>
          <form className="space-y-4">
            {essayQuestions.map((q) => (
              <div key={q.id} className="p-3 border rounded-md space-y-2">
                <div className="text-sm text-muted-foreground">
                  Esai • {q.points} poin
                </div>
                <div className="font-medium">{q.prompt}</div>
                <div className="bg-accent/40 p-3 rounded-md">
                  <div className="text-sm mb-1">Jawaban siswa:</div>
                  <div className="whitespace-pre-wrap">
                    {data.answers[q.id]?.essay_text ?? (
                      <span className="text-muted-foreground">(belum ada)</span>
                    )}
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium">Skor</label>
                    <Input
                      type="number"
                      min={0}
                      max={q.points}
                      value={Number(form.getValues()[q.id]?.score ?? 0)}
                      onChange={(e) => {
                        const current = form.getValues();
                        const prev = current[q.id] ?? {
                          score: 0,
                          feedback: "",
                        };
                        form.reset({
                          ...current,
                          [q.id]: { ...prev, score: Number(e.target.value) },
                        });
                      }}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Umpan balik</label>
                    <Textarea
                      rows={3}
                      value={form.getValues()[q.id]?.feedback ?? ""}
                      onChange={(e) => {
                        const current = form.getValues();
                        const prev = current[q.id] ?? {
                          score: 0,
                          feedback: "",
                        };
                        form.reset({
                          ...current,
                          [q.id]: { ...prev, feedback: e.target.value },
                        });
                      }}
                    />
                  </div>
                </div>
                <div>
                  <Button
                    type="button"
                    disabled={isPending}
                    onClick={() => onSave(q.id)}>
                    {isPending ? "Menyimpan..." : "Simpan Nilai Esai"}
                  </Button>
                </div>
              </div>
            ))}
          </form>
        </Form>
      )}
    </div>
  );
}
