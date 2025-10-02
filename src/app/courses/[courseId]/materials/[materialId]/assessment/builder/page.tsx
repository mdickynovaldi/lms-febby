import { createSupabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import CreateAssessmentForm from "./create-assessment-form";
import AddQuestionForm from "./question-form";
import QuestionItem from "./question-item";

export default async function AssessmentBuilderPage({
  params,
}: {
  params: Promise<{ courseId: string; materialId: string }>;
}) {
  const { courseId, materialId } = await params;
  const supabase = await createSupabaseServer();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/login");
  const role = (session.user.user_metadata as { role?: string })?.role;
  if (role !== "teacher") redirect("/dashboard");

  const { data: assessment } = await supabase
    .from("assessments")
    .select("id, title, description, time_limit_minutes, total_weight")
    .eq("material_id", materialId)
    .eq("created_by", session.user.id)
    .single();

  const { data: questions } = assessment
    ? await supabase
        .from("assessment_questions")
        .select("id, type, prompt, points")
        .eq("assessment_id", assessment.id)
    : { data: [] };

  const optionsByQuestion: Record<
    string,
    { label: string; isCorrect: boolean }[]
  > = {};
  if (questions && questions.length > 0) {
    const ids = questions.map((q) => q.id as string);
    const { data: opts } = await supabase
      .from("question_options")
      .select("question_id, label, is_correct")
      .in("question_id", ids);
    for (const o of opts ?? []) {
      const qid = (o.question_id as unknown as string) ?? "";
      if (!optionsByQuestion[qid]) optionsByQuestion[qid] = [];
      optionsByQuestion[qid].push({
        label: (o.label as unknown as string) ?? "",
        isCorrect: Boolean(o.is_correct),
      });
    }
  }

  return (
    <main className="p-6 space-y-6">
      <h1 className="text-xl font-semibold">Builder Soal Materi</h1>
      <CreateAssessmentForm
        materialId={materialId}
        existing={
          assessment
            ? {
                id: assessment.id,
                title: assessment.title,
                description: assessment.description ?? undefined,
                timeLimitMinutes: assessment.time_limit_minutes ?? 0,
                totalWeight: assessment.total_weight ?? 100,
              }
            : undefined
        }
      />

      {assessment && (
        <section className="space-y-4">
          <h2 className="text-lg font-medium">Daftar Soal</h2>
          <AddQuestionForm assessmentId={assessment.id} />
          <ul className="space-y-2">
            {questions?.map((q) => (
              <li key={q.id}>
                <QuestionItem
                  question={{
                    id: q.id as string,
                    assessmentId: assessment.id as string,
                    type: q.type as "multiple_choice" | "essay",
                    prompt: q.prompt as string,
                    points: Number(q.points),
                  }}
                  options={optionsByQuestion[q.id as string]}
                />
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
