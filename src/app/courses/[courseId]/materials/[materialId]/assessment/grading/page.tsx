import { createSupabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import GradeClient from "./grade-client";

export default async function GradingPage({
  params,
}: {
  params: { courseId: string; materialId: string };
}) {
  const { materialId } = params;
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const role = (user.user_metadata as { role?: string })?.role;
  if (role !== "teacher") redirect("/dashboard");

  const { data: assessment } = await supabase
    .from("assessments")
    .select("id, title")
    .eq("material_id", materialId)
    .eq("created_by", user.id)
    .single();
  if (!assessment) {
    return <main className="p-6">Belum ada assessment untuk materi ini.</main>;
  }

  let submissions:
    | {
        id: string;
        student_id: string;
        student_name?: string | null;
        student_nim?: string | null;
        status: string;
        final_score: number | null;
        started_at: string | null;
        submitted_at: string | null;
      }[]
    | null = null;

  // Coba select dengan kolom tambahan (jika sudah tersedia)
  const { data: subWithMeta, error: subErr } = await supabase
    .from("assessment_submissions")
    .select(
      "id, student_id, student_name, student_nim, status, final_score, started_at, submitted_at"
    )
    .eq("assessment_id", assessment.id);

  if (!subErr) {
    submissions = subWithMeta ?? [];
  } else {
    // Fallback tanpa kolom baru bila schema cache belum memuat kolom tsb
    const { data: subNoMeta } = await supabase
      .from("assessment_submissions")
      .select("id, student_id, status, final_score, started_at, submitted_at")
      .eq("assessment_id", assessment.id);
    submissions = (subNoMeta ?? []).map((s) => ({
      ...s,
      student_name: null,
      student_nim: null,
    }));
  }

  // Ambil semua essay answers
  const { data: essayAnswers } = await supabase
    .from("assessment_answers_essay")
    .select("submission_id, question_id, essay_text, score, feedback");

  const { data: questions } = await supabase
    .from("assessment_questions")
    .select("id, type, prompt, points")
    .eq("assessment_id", assessment.id);

  // Kumpulkan siswa dari submissions
  const baseStudents = Array.from(
    new Map(
      (submissions ?? []).map((s) => [
        s.student_id,
        {
          id: s.student_id,
          name: s.student_name ?? null,
          nim: s.student_nim ?? null,
        },
      ])
    ).values()
  );

  // Lengkapi nama/nim via RPC bila masih null
  let students = baseStudents;
  if (baseStudents.some((s) => !s.name || s.name.trim() === "")) {
    const ids = baseStudents.map((s) => s.id);
    const { data: metaRows } = await supabase.rpc("get_user_public_meta", {
      user_ids: ids,
    });
    type PublicMeta = { id: string; name?: string | null; nim?: string | null };
    const metaList = (metaRows ?? []) as unknown as PublicMeta[];
    const metaById = new Map(metaList.map((m) => [m.id, m]));
    students = baseStudents.map((s) => {
      const m = metaById.get(s.id);
      return {
        id: s.id,
        name: s.name && s.name.trim() !== "" ? s.name : m?.name ?? null,
        nim: s.nim && s.nim.trim() !== "" ? s.nim : m?.nim ?? null,
      };
    });
  }

  // Enrich submissions dengan nama/nim hasil RPC agar header kartu tidak kosong
  const studentMap = new Map(students.map((s) => [s.id, s]));
  const submissionsEnriched = (submissions ?? []).map((s) => ({
    ...s,
    student_name: s.student_name ?? studentMap.get(s.student_id)?.name ?? null,
    student_nim: s.student_nim ?? studentMap.get(s.student_id)?.nim ?? null,
  }));

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">Penilaian: {assessment.title}</h1>
      <GradeClient
        submissions={submissionsEnriched}
        essayAnswers={essayAnswers ?? []}
        questions={questions ?? []}
        students={students}
      />
    </main>
  );
}
