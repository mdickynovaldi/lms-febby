"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Form } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { submitAnswers } from "../actions";
import { type SubmitAnswersInput } from "@/lib/schemas/assessment";

type Props = {
  assessment: { id: string; timeLimitMinutes: number; totalWeight: number };
  questions: { id: string; type: string; prompt: string; points: number }[];
  options: { id: string; question_id: string; label: string }[];
};

type Values = Record<string, string>;

export default function AttemptClient({
  assessment,
  questions,
  options,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [timeLeft, setTimeLeft] = useState<number | null>(
    assessment.timeLimitMinutes > 0 ? assessment.timeLimitMinutes * 60 : null
  );
  const form = useForm<{ values: Values }>({ defaultValues: { values: {} } });

  useEffect(() => {
    if (timeLeft === null) return;
    if (timeLeft <= 0) return;
    const id = setInterval(() => setTimeLeft((s) => (s ?? 0) - 1), 1000);
    return () => clearInterval(id);
  }, [timeLeft]);

  const optionsByQuestion = useMemo(() => {
    const map = new Map<string, { id: string; label: string }[]>();
    for (const o of options) {
      const arr = map.get(o.question_id) ?? [];
      arr.push({ id: o.id, label: o.label });
      map.set(o.question_id, arr);
    }
    return map;
  }, [options]);

  const onSubmit = (vals: { values: Values }) => {
    startTransition(async () => {
      const answers: SubmitAnswersInput["answers"] = questions.map((q) => {
        const v = vals.values[q.id];
        if (q.type === "multiple_choice") {
          return {
            type: "multiple_choice",
            questionId: q.id,
            selectedOptionId: v,
          } as const;
        }
        return { type: "essay", questionId: q.id, essayText: v ?? "" } as const;
      });
      const payload: SubmitAnswersInput = {
        assessmentId: assessment.id,
        answers,
      };
      const res = await submitAnswers(payload);
      if (!res.success) {
        toast.error(typeof res.error === "string" ? res.error : "Gagal submit");
        return;
      }
      toast.success(
        `Terkirim. Nilai akhir: ${Math.round(res.data.finalScore ?? 0)}`
      );
    });
  };

  const minutes = timeLeft !== null ? Math.floor(timeLeft / 60) : null;
  const seconds = timeLeft !== null ? timeLeft % 60 : null;

  return (
    <div className="space-y-4">
      {timeLeft !== null && (
        <div className="p-2 rounded-md border w-fit text-sm">
          Waktu tersisa: {minutes}:{String(seconds).padStart(2, "0")}
        </div>
      )}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {questions.map((q, idx) => (
            <div key={q.id} className="p-4 border rounded-md space-y-3">
              <div className="text-sm text-muted-foreground">
                Soal {idx + 1} • {q.type} • {q.points} poin
              </div>
              <div className="font-medium">{q.prompt}</div>
              {q.type === "multiple_choice" ? (
                <div className="space-y-2">
                  {(optionsByQuestion.get(q.id) ?? []).map((o) => (
                    <label key={o.id} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`q-${q.id}`}
                        value={o.id}
                        onChange={() => {
                          const current = form.getValues("values");
                          form.setValue("values", { ...current, [q.id]: o.id });
                        }}
                      />
                      <span>{o.label}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Jawaban Anda</label>
                  <Textarea
                    rows={4}
                    value={form.watch("values")[q.id] ?? ""}
                    onChange={(e) => {
                      const current = form.getValues("values");
                      form.setValue("values", {
                        ...current,
                        [q.id]: e.target.value,
                      });
                    }}
                  />
                </div>
              )}
            </div>
          ))}
          <Button type="submit" disabled={isPending}>
            {isPending ? "Mengirim..." : "Kirim Jawaban"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
