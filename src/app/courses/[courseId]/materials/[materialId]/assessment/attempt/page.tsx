import { createSupabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AttemptClient from "./attempt-client";

export default async function AttemptPage({
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
    .select("id, title, description, time_limit_minutes, total_weight")
    .eq("material_id", params.materialId)
    .single();
  if (!assessment) {
    return <main className="p-6">Belum ada assessment untuk materi ini.</main>;
  }

  const { data: questions } = await supabase
    .from("assessment_questions")
    .select("id, type, prompt, points")
    .eq("assessment_id", assessment.id);

  const { data: options } = await supabase
    .from("question_options")
    .select("id, question_id, label")
    .in("question_id", questions?.map((q) => q.id) ?? []);

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">{assessment.title}</h1>
      {assessment.description && (
        <p className="text-muted-foreground">{assessment.description}</p>
      )}
      <AttemptClient
        assessment={{
          id: assessment.id,
          timeLimitMinutes: assessment.time_limit_minutes,
          totalWeight: assessment.total_weight,
        }}
        questions={questions ?? []}
        options={options ?? []}
      />
    </main>
  );
}

