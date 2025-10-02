"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import {
  createAssessmentSchema,
  updateAssessmentSchema,
  createQuestionSchema,
  updateQuestionSchema,
  submitAnswersSchema,
  gradeEssaySchema,
  type CreateAssessmentInput,
  type UpdateAssessmentInput,
  type CreateQuestionInput,
  type UpdateQuestionInput,
  type SubmitAnswersInput,
  type GradeEssayInput,
} from "@/lib/schemas/assessment";
import { gradeMultipleChoice } from "@/lib/grade";
import { deleteByIdSchema } from "@/lib/schemas/course-material";

function ensureTeacherRole(role: string | undefined) {
  if (role !== "teacher") {
    throw new Error("Akses ditolak: hanya guru yang dapat melakukan aksi ini");
  }
}

function ensureStudentRole(role: string | undefined) {
  if (role !== "student") {
    throw new Error("Akses ditolak: hanya siswa yang dapat melakukan aksi ini");
  }
}

export async function createAssessment(input: CreateAssessmentInput) {
  const parsed = createAssessmentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.flatten().fieldErrors,
    } as const;
  }

  const supabase = await createSupabaseServer();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/login");
  const role = (session.user.user_metadata as { role?: string })?.role;
  ensureTeacherRole(role);

  const { materialId, title, description, timeLimitMinutes, totalWeight } =
    parsed.data;

  const { data, error } = await supabase
    .from("assessments")
    .insert({
      material_id: materialId,
      title,
      description,
      time_limit_minutes: timeLimitMinutes,
      total_weight: totalWeight,
      created_by: session.user.id,
    })
    .select("id")
    .single();

  if (error) {
    return { success: false, error: error.message } as const;
  }

  revalidatePath(
    `/courses/[courseId]/materials/[materialId]/assessment/builder`
  );
  return { success: true, data: { id: data.id } } as const;
}

export async function updateAssessment(input: UpdateAssessmentInput) {
  const parsed = updateAssessmentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.flatten().fieldErrors,
    } as const;
  }
  const supabase = await createSupabaseServer();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/login");
  const role = (session.user.user_metadata as { role?: string })?.role;
  ensureTeacherRole(role);

  const { id, materialId, title, description, timeLimitMinutes, totalWeight } =
    parsed.data;

  const { error } = await supabase
    .from("assessments")
    .update({
      material_id: materialId,
      title,
      description,
      time_limit_minutes: timeLimitMinutes,
      total_weight: totalWeight,
    })
    .eq("id", id)
    .eq("created_by", session.user.id);

  if (error) {
    return { success: false, error: error.message } as const;
  }
  revalidatePath(
    `/courses/[courseId]/materials/[materialId]/assessment/builder`
  );
  return { success: true } as const;
}

export async function addQuestion(input: CreateQuestionInput) {
  const parsed = createQuestionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.flatten().fieldErrors,
    } as const;
  }
  const supabase = await createSupabaseServer();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/login");
  const role = (session.user.user_metadata as { role?: string })?.role;
  ensureTeacherRole(role);

  const { assessmentId, type, prompt, points, options } = parsed.data;

  const { data: assess, error: assessErr } = await supabase
    .from("assessments")
    .select("id, created_by")
    .eq("id", assessmentId)
    .single();
  if (assessErr) return { success: false, error: assessErr.message } as const;
  if (assess.created_by !== session.user.id)
    return { success: false, error: "Tidak berwenang" } as const;

  const { data: q, error: qErr } = await supabase
    .from("assessment_questions")
    .insert({ assessment_id: assessmentId, type, prompt, points })
    .select("id")
    .single();
  if (qErr) return { success: false, error: qErr.message } as const;

  if (type === "multiple_choice" && options && options.length > 0) {
    const insertOptions = options.map((o) => ({
      question_id: q.id,
      label: o.label,
      is_correct: o.isCorrect,
    }));
    const { error: oErr } = await supabase
      .from("question_options")
      .insert(insertOptions);
    if (oErr) return { success: false, error: oErr.message } as const;
  }

  revalidatePath(
    `/courses/[courseId]/materials/[materialId]/assessment/builder`
  );
  return { success: true } as const;
}

export async function updateQuestion(input: UpdateQuestionInput) {
  const parsed = updateQuestionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.flatten().fieldErrors,
    } as const;
  }
  const supabase = await createSupabaseServer();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/login");
  const role = (session.user.user_metadata as { role?: string })?.role;
  ensureTeacherRole(role);

  const { id, type, prompt, points, options } = parsed.data;

  // Pastikan soal milik assessment yang dibuat guru ini (dua langkah agar tipe jelas)
  const { data: qRow, error: qRowErr } = await supabase
    .from("assessment_questions")
    .select("id, assessment_id")
    .eq("id", id)
    .maybeSingle();
  if (qRowErr) return { success: false, error: qRowErr.message } as const;
  if (!qRow) return { success: false, error: "Soal tidak ditemukan" } as const;
  const { data: aRow, error: aErr2 } = await supabase
    .from("assessments")
    .select("id, created_by")
    .eq("id", (qRow as { assessment_id: string }).assessment_id)
    .maybeSingle();
  if (aErr2) return { success: false, error: aErr2.message } as const;
  if (!aRow || (aRow as { created_by: string }).created_by !== session.user.id)
    return { success: false, error: "Tidak berwenang" } as const;

  const { error: updErr } = await supabase
    .from("assessment_questions")
    .update({ type, prompt, points })
    .eq("id", id);
  if (updErr) return { success: false, error: updErr.message } as const;

  // Kelola opsi: untuk MCQ, replace semua opsi; untuk essay, hapus opsi jika ada
  if (type === "multiple_choice") {
    if (options && options.length > 0) {
      const { error: delErr } = await supabase
        .from("question_options")
        .delete()
        .eq("question_id", id);
      if (delErr) return { success: false, error: delErr.message } as const;
      const insertOptions = options.map((o) => ({
        question_id: id,
        label: o.label,
        is_correct: o.isCorrect,
      }));
      const { error: insErr } = await supabase
        .from("question_options")
        .insert(insertOptions);
      if (insErr) return { success: false, error: insErr.message } as const;
    }
  } else {
    // Essay: pastikan tidak ada opsi
    await supabase.from("question_options").delete().eq("question_id", id);
  }

  revalidatePath(
    `/courses/[courseId]/materials/[materialId]/assessment/builder`
  );
  return { success: true } as const;
}

export async function deleteQuestion(input: { id: string }) {
  const parsed = deleteByIdSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.flatten().fieldErrors,
    } as const;
  }
  const supabase = await createSupabaseServer();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/login");
  const role = (session.user.user_metadata as { role?: string })?.role;
  ensureTeacherRole(role);

  const { id } = parsed.data;
  // Cek kepemilikan (dua langkah agar tipe jelas)
  const { data: qRow2, error: qRowErr2 } = await supabase
    .from("assessment_questions")
    .select("id, assessment_id")
    .eq("id", id)
    .maybeSingle();
  if (qRowErr2) return { success: false, error: qRowErr2.message } as const;
  if (!qRow2) return { success: false, error: "Soal tidak ditemukan" } as const;
  const { data: aRow2, error: aErr3 } = await supabase
    .from("assessments")
    .select("id, created_by")
    .eq("id", (qRow2 as { assessment_id: string }).assessment_id)
    .maybeSingle();
  if (aErr3) return { success: false, error: aErr3.message } as const;
  if (
    !aRow2 ||
    (aRow2 as { created_by: string }).created_by !== session.user.id
  )
    return { success: false, error: "Tidak berwenang" } as const;

  const { data: delRows, error: delErr } = await supabase
    .from("assessment_questions")
    .delete()
    .eq("id", id)
    .select("id");
  if (delErr) return { success: false, error: delErr.message } as const;
  if (!delRows || delRows.length === 0)
    return {
      success: false,
      error: "Data tidak ditemukan/akses ditolak",
    } as const;

  revalidatePath(
    `/courses/[courseId]/materials/[materialId]/assessment/builder`
  );
  return { success: true } as const;
}

const submitSchema = submitAnswersSchema;

export async function submitAnswers(input: SubmitAnswersInput) {
  const parsed = submitSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.flatten().fieldErrors,
    } as const;
  }
  const supabase = await createSupabaseServer();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/login");
  const role = (session.user.user_metadata as { role?: string })?.role;
  ensureStudentRole(role);

  const { assessmentId, submissionId, answers } = parsed.data;

  const { data: assessment, error: aErr } = await supabase
    .from("assessments")
    .select("id, time_limit_minutes, total_weight")
    .eq("id", assessmentId)
    .single();
  if (aErr) return { success: false, error: aErr.message } as const;

  const { data: questions, error: qErr } = await supabase
    .from("assessment_questions")
    .select("id, type, points")
    .eq("assessment_id", assessmentId);
  if (qErr) return { success: false, error: qErr.message } as const;

  const questionsById = new Map(
    questions.map((q) => [
      q.id as string,
      q as { id: string; type: string; points: number },
    ])
  );

  let subId = submissionId;
  if (!subId) {
    const meta = session.user.user_metadata as {
      name?: string;
      nim?: string;
    };
    const { data: sub, error: sErr } = await supabase
      .from("assessment_submissions")
      .insert({
        assessment_id: assessmentId,
        student_id: session.user.id,
      })
      .select("id, started_at")
      .single();
    if (sErr) return { success: false, error: sErr.message } as const;
    subId = sub.id as string;
    // Best-effort: isi metadata siswa jika kolom tersedia di schema cache
    // Abaikan error agar tidak memblokir alur submit
    await supabase
      .from("assessment_submissions")
      .update({
        student_name: meta.name ?? null,
        student_nim: meta.nim ?? null,
      })
      .eq("id", subId);
  }

  const { data: existingSub, error: subFetchErr } = await supabase
    .from("assessment_submissions")
    .select("id, started_at, status")
    .eq("id", subId!)
    .eq("student_id", session.user.id)
    .single();
  if (subFetchErr)
    return { success: false, error: subFetchErr.message } as const;
  if (existingSub.status === "graded") {
    return { success: false, error: "Submission sudah dinilai" } as const;
  }

  if (assessment.time_limit_minutes && assessment.time_limit_minutes > 0) {
    const startedAt = new Date(existingSub.started_at as unknown as string);
    const now = new Date();
    const diffMin = (now.getTime() - startedAt.getTime()) / 1000 / 60;
    if (diffMin > assessment.time_limit_minutes + 1) {
      return { success: false, error: "Waktu pengerjaan habis" } as const;
    }
  }

  const mcqScores: number[] = [];

  for (const ans of answers) {
    const q = questionsById.get(ans.questionId);
    if (!q) continue;
    if (ans.type === "multiple_choice") {
      const { data: options, error: oErr } = await supabase
        .from("question_options")
        .select("id, is_correct")
        .eq("question_id", ans.questionId);
      if (oErr) return { success: false, error: oErr.message } as const;
      const { isCorrect, score } = gradeMultipleChoice(
        {
          id: q.id,
          assessmentId,
          type: "multiple_choice",
          prompt: "",
          points: q.points,
        },
        options.map((o) => ({
          id: o.id as string,
          questionId: ans.questionId,
          label: "",
          isCorrect: o.is_correct as boolean,
        })),
        ans.selectedOptionId
      );
      mcqScores.push(score);
      const { error: insErr } = await supabase
        .from("assessment_answers_mcq")
        .upsert(
          {
            submission_id: subId,
            question_id: ans.questionId,
            selected_option_id: ans.selectedOptionId,
            is_correct: isCorrect,
            score,
          },
          { onConflict: "submission_id,question_id" }
        );
      if (insErr) return { success: false, error: insErr.message } as const;
    } else if (ans.type === "essay") {
      const { error: insErr } = await supabase
        .from("assessment_answers_essay")
        .upsert(
          {
            submission_id: subId,
            question_id: ans.questionId,
            essay_text: ans.essayText,
          },
          { onConflict: "submission_id,question_id" }
        );
      if (insErr) return { success: false, error: insErr.message } as const;
    }
  }

  const { data: qPointsAgg, error: aggErr } = await supabase
    .from("assessment_questions")
    .select("points")
    .eq("assessment_id", assessmentId);
  if (aggErr) return { success: false, error: aggErr.message } as const;
  const totalPoints = qPointsAgg.reduce((sum, r) => sum + Number(r.points), 0);

  const { data: mcqAgg, error: mcqAggErr } = await supabase
    .from("assessment_answers_mcq")
    .select("score")
    .eq("submission_id", subId!);
  if (mcqAggErr) return { success: false, error: mcqAggErr.message } as const;
  const mcqSum = mcqAgg.reduce((sum, r) => sum + Number(r.score ?? 0), 0);

  const { data: essayAgg, error: essayAggErr } = await supabase
    .from("assessment_answers_essay")
    .select("score")
    .eq("submission_id", subId!);
  if (essayAggErr)
    return { success: false, error: essayAggErr.message } as const;
  const essaySum = essayAgg.reduce((sum, r) => sum + Number(r.score ?? 0), 0);

  const raw = mcqSum + essaySum;
  const final =
    totalPoints > 0 ? (raw / totalPoints) * assessment.total_weight : 0;

  const { error: updErr } = await supabase
    .from("assessment_submissions")
    .update({
      status: "submitted",
      submitted_at: new Date().toISOString(),
      score_raw: raw,
      final_score: final,
    })
    .eq("id", subId!)
    .eq("student_id", session.user.id);
  if (updErr) return { success: false, error: updErr.message } as const;

  revalidatePath(
    `/courses/[courseId]/materials/[materialId]/assessment/result`
  );
  return {
    success: true,
    data: { submissionId: subId, finalScore: final },
  } as const;
}

export async function gradeEssay(input: GradeEssayInput) {
  const parsed = gradeEssaySchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.flatten().fieldErrors,
    } as const;
  }
  const supabase = await createSupabaseServer();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/login");
  const role = (session.user.user_metadata as { role?: string })?.role;
  ensureTeacherRole(role);

  const { submissionId, questionId, score, feedback } = parsed.data;

  const { data: subJoin, error: joinErr } = await supabase
    .from("assessment_submissions")
    .select("id, assessment_id, student_id")
    .eq("id", submissionId)
    .single();
  if (joinErr) return { success: false, error: joinErr.message } as const;
  const { data: assessmentInfo, error: assessInfoErr } = await supabase
    .from("assessments")
    .select("created_by, total_weight")
    .eq("id", (subJoin as { assessment_id: string }).assessment_id)
    .single();
  if (assessInfoErr)
    return { success: false, error: assessInfoErr.message } as const;
  if (!assessmentInfo)
    return { success: false, error: "Assessment tidak ditemukan" } as const;
  if ((assessmentInfo as { created_by: string }).created_by !== session.user.id)
    return { success: false, error: "Tidak berwenang menilai" } as const;
  const totalWeight = Number(
    (assessmentInfo as { total_weight: number }).total_weight
  );

  const { error: updEssayErr } = await supabase
    .from("assessment_answers_essay")
    .update({ score, feedback })
    .eq("submission_id", submissionId)
    .eq("question_id", questionId);
  if (updEssayErr)
    return { success: false, error: updEssayErr.message } as const;

  const { data: qPointsAgg, error: qAggErr } = await supabase
    .from("assessment_questions")
    .select("points")
    .eq("assessment_id", subJoin.assessment_id);
  if (qAggErr) return { success: false, error: qAggErr.message } as const;
  const totalPoints = qPointsAgg.reduce((sum, r) => sum + Number(r.points), 0);

  const { data: mcqAgg, error: mcqAggErr } = await supabase
    .from("assessment_answers_mcq")
    .select("score")
    .eq("submission_id", submissionId);
  if (mcqAggErr) return { success: false, error: mcqAggErr.message } as const;
  const mcqSum = mcqAgg.reduce((sum, r) => sum + Number(r.score ?? 0), 0);

  const { data: essayAgg, error: essayAggErr } = await supabase
    .from("assessment_answers_essay")
    .select("score")
    .eq("submission_id", submissionId);
  if (essayAggErr)
    return { success: false, error: essayAggErr.message } as const;
  const essaySum = essayAgg.reduce((sum, r) => sum + Number(r.score ?? 0), 0);

  const raw = mcqSum + essaySum;
  const final = totalPoints > 0 ? (raw / totalPoints) * totalWeight : 0;

  const allEssayGraded = essayAgg.every(
    (e) => e.score !== null && e.score !== undefined
  );

  const { error: updSubErr } = await supabase
    .from("assessment_submissions")
    .update({
      score_raw: raw,
      final_score: final,
      status: allEssayGraded ? "graded" : "submitted",
    })
    .eq("id", submissionId);
  if (updSubErr) return { success: false, error: updSubErr.message } as const;

  revalidatePath(
    `/courses/[courseId]/materials/[materialId]/assessment/grading`
  );
  revalidatePath(
    `/courses/[courseId]/materials/[materialId]/assessment/result`
  );
  return {
    success: true,
    data: { finalScore: final, graded: allEssayGraded },
  } as const;
}
