import { createSupabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function ResultPage({
  params,
}: {
  params: { courseId: string; materialId: string };
}) {
  const supabase = await createSupabaseServer();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/login");
  const role = (session.user.user_metadata as { role?: string })?.role;
  if (role !== "student") redirect("/dashboard");

  const { data: assessment } = await supabase
    .from("assessments")
    .select("id, title")
    .eq("material_id", params.materialId)
    .single();
  if (!assessment) return <main className="p-6">Belum ada assessment.</main>;

  const { data: sub } = await supabase
    .from("assessment_submissions")
    .select("id, status, final_score, score_raw, started_at, submitted_at")
    .eq("assessment_id", assessment.id)
    .eq("student_id", session.user.id)
    .order("submitted_at", { ascending: false })
    .limit(1)
    .single();

  const { data: essays } = await supabase
    .from("assessment_answers_essay")
    .select("question_id, score, feedback, essay_text")
    .eq("submission_id", sub?.id ?? "00000000-0000-0000-0000-000000000000");

  const { data: mcqs } = await supabase
    .from("assessment_answers_mcq")
    .select("question_id, selected_option_id, is_correct, score")
    .eq("submission_id", sub?.id ?? "00000000-0000-0000-0000-000000000000");

  const { data: questions } = await supabase
    .from("assessment_questions")
    .select("id, type, prompt, points")
    .eq("assessment_id", assessment.id);

  const { data: options } = await supabase
    .from("question_options")
    .select("id, question_id, label, is_correct")
    .in(
      "question_id",
      questions?.filter((q) => q.type === "multiple_choice").map((q) => q.id) ??
        []
    );

  const essayMap = new Map(essays?.map((e) => [e.question_id, e]) ?? []);
  const mcqMap = new Map(mcqs?.map((m) => [m.question_id, m]) ?? []);
  const optionLabelById = new Map(options?.map((o) => [o.id, o.label]) ?? []);
  type OptionRow = {
    id: string;
    question_id: string;
    label: string;
    is_correct: boolean;
  };
  const correctLabelByQuestion = new Map(
    (options as OptionRow[] | null | undefined)
      ?.filter((o) => o.is_correct === true)
      .map((o) => [o.question_id, o.label]) ?? []
  );

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">Hasil: {assessment.title}</h1>
      {!sub ? (
        <div>Anda belum mengerjakan assessment ini.</div>
      ) : (
        <div className="space-y-4">
          <div className="p-3 border rounded-md">
            <div>Status: {sub.status}</div>
            <div>Nilai akhir: {Math.round(Number(sub.final_score ?? 0))}</div>
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-medium">Umpan Balik Esai</h2>
            {questions
              ?.filter((q) => q.type === "essay")
              .map((q) => {
                const e = essayMap.get(q.id);
                return (
                  <div key={q.id} className="p-3 border rounded-md">
                    <div className="font-medium">{q.prompt}</div>
                    <div className="text-sm text-muted-foreground">
                      Skor: {e?.score ?? 0} / {q.points}
                    </div>
                    <div className="mt-2 bg-accent/40 p-3 rounded-md">
                      <div className="text-sm mb-1">Jawaban Anda:</div>
                      <div className="whitespace-pre-wrap">
                        {e?.essay_text ?? (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </div>
                    </div>
                    <div className="mt-1">Feedback: {e?.feedback ?? "-"}</div>
                  </div>
                );
              })}
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-medium">Hasil Pilihan Ganda</h2>
            {questions
              ?.filter((q) => q.type === "multiple_choice")
              .map((q) => {
                const m = mcqMap.get(q.id);
                const selectedLabel = m?.selected_option_id
                  ? optionLabelById.get(m.selected_option_id)
                  : undefined;
                const correctLabel = correctLabelByQuestion.get(q.id);
                return (
                  <div key={q.id} className="p-3 border rounded-md">
                    <div className="font-medium">{q.prompt}</div>
                    <div className="text-sm text-muted-foreground">
                      Jawaban: {selectedLabel ?? "-"}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Kunci: {correctLabel ?? "-"}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Skor: {Number(m?.score ?? 0)} / {q.points}{" "}
                      {m?.is_correct === true
                        ? "(benar)"
                        : m?.is_correct === false
                        ? "(salah)"
                        : ""}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </main>
  );
}
