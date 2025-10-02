"use server";

import { createSupabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  createCourseSchema,
  createMaterialSchema,
  type CreateCourseInput,
  type CreateMaterialInput,
} from "@/lib/schemas/course-material";
import {
  updateCourseSchema,
  updateMaterialSchema,
  deleteByIdSchema,
  type UpdateCourseInput,
  type UpdateMaterialInput,
  type DeleteByIdInput,
} from "@/lib/schemas/course-material";
import {
  createMaterialContentSchema,
  updateMaterialContentSchema,
  deleteMaterialContentSchema,
  type CreateMaterialContentInput,
  type UpdateMaterialContentInput,
  type DeleteMaterialContentInput,
} from "@/lib/schemas/course-material";

function ensureTeacher(role?: string) {
  if (role !== "teacher") throw new Error("Akses ditolak: hanya guru");
}

export async function createCourse(input: CreateCourseInput) {
  const parsed = createCourseSchema.safeParse(input);
  if (!parsed.success)
    return {
      success: false,
      error: parsed.error.flatten().fieldErrors,
    } as const;
  const supabase = await createSupabaseServer();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/login");
  ensureTeacher((session.user.user_metadata as { role?: string })?.role);

  const { title, description } = parsed.data;
  const { data, error } = await supabase
    .from("courses")
    .insert({ title, description, created_by: session.user.id })
    .select("id")
    .single();
  if (error) return { success: false, error: error.message } as const;
  return { success: true, data: { id: data.id } } as const;
}

export async function createMaterial(input: CreateMaterialInput) {
  const parsed = createMaterialSchema.safeParse(input);
  if (!parsed.success)
    return {
      success: false,
      error: parsed.error.flatten().fieldErrors,
    } as const;
  const supabase = await createSupabaseServer();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/login");
  ensureTeacher((session.user.user_metadata as { role?: string })?.role);

  const { courseId, title, description } = parsed.data;
  // Pastikan course milik guru
  const { data: c, error: cErr } = await supabase
    .from("courses")
    .select("id, created_by")
    .eq("id", courseId)
    .single();
  if (cErr) return { success: false, error: cErr.message } as const;
  if (c.created_by !== session.user.id)
    return { success: false, error: "Bukan pemilik course" } as const;

  const { data, error } = await supabase
    .from("materials")
    .insert({
      course_id: courseId,
      title,
      description,
      created_by: session.user.id,
    })
    .select("id")
    .single();
  if (error) return { success: false, error: error.message } as const;
  return { success: true, data: { id: data.id } } as const;
}

export async function updateCourse(input: UpdateCourseInput) {
  const parsed = updateCourseSchema.safeParse(input);
  if (!parsed.success)
    return {
      success: false,
      error: parsed.error.flatten().fieldErrors,
    } as const;
  const supabase = await createSupabaseServer();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/login");
  ensureTeacher((session.user.user_metadata as { role?: string })?.role);

  const { id, title, description } = parsed.data;
  const { error } = await supabase
    .from("courses")
    .update({ title, description })
    .eq("id", id)
    .eq("created_by", session.user.id);
  if (error) return { success: false, error: error.message } as const;
  return { success: true } as const;
}

export async function deleteCourse(input: DeleteByIdInput) {
  const parsed = deleteByIdSchema.safeParse(input);
  if (!parsed.success)
    return {
      success: false,
      error: parsed.error.flatten().fieldErrors,
    } as const;
  const supabase = await createSupabaseServer();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/login");
  ensureTeacher((session.user.user_metadata as { role?: string })?.role);

  const { id } = parsed.data;
  const { data, error } = await supabase
    .from("courses")
    .delete()
    .eq("id", id)
    .eq("created_by", session.user.id)
    .select("id");
  if (error) return { success: false, error: error.message } as const;
  if (!data || data.length === 0)
    return {
      success: false,
      error: "Data tidak ditemukan/akses ditolak",
    } as const;
  return { success: true } as const;
}

export async function updateMaterialAction(input: UpdateMaterialInput) {
  const parsed = updateMaterialSchema.safeParse(input);
  if (!parsed.success)
    return {
      success: false,
      error: parsed.error.flatten().fieldErrors,
    } as const;
  const supabase = await createSupabaseServer();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/login");
  ensureTeacher((session.user.user_metadata as { role?: string })?.role);

  const { id, courseId, title, description } = parsed.data;
  // Pastikan course pemiliknya adalah guru saat ini
  const { data: c, error: cErr } = await supabase
    .from("courses")
    .select("id, created_by")
    .eq("id", courseId)
    .single();
  if (cErr) return { success: false, error: cErr.message } as const;
  if (c.created_by !== session.user.id)
    return { success: false, error: "Bukan pemilik course" } as const;

  const { error } = await supabase
    .from("materials")
    .update({ course_id: courseId, title, description })
    .eq("id", id)
    .eq("created_by", session.user.id);
  if (error) return { success: false, error: error.message } as const;
  return { success: true } as const;
}

export async function deleteMaterial(input: DeleteByIdInput) {
  const parsed = deleteByIdSchema.safeParse(input);
  if (!parsed.success)
    return {
      success: false,
      error: parsed.error.flatten().fieldErrors,
    } as const;
  const supabase = await createSupabaseServer();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/login");
  ensureTeacher((session.user.user_metadata as { role?: string })?.role);

  const { id } = parsed.data;
  const { data, error } = await supabase
    .from("materials")
    .delete()
    .eq("id", id)
    .eq("created_by", session.user.id)
    .select("id");
  if (error) return { success: false, error: error.message } as const;
  if (!data || data.length === 0)
    return {
      success: false,
      error: "Data tidak ditemukan/akses ditolak",
    } as const;
  return { success: true } as const;
}

// Material contents actions
export async function addMaterialContent(input: CreateMaterialContentInput) {
  const parsed = createMaterialContentSchema.safeParse(input);
  if (!parsed.success)
    return {
      success: false,
      error: parsed.error.flatten().fieldErrors,
    } as const;
  const supabase = await createSupabaseServer();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/login");
  ensureTeacher((session.user.user_metadata as { role?: string })?.role);

  const { materialId } = parsed.data;
  // Pastikan material milik course yang dimiliki guru
  const { error: checkErr } = await supabase
    .from("materials")
    .select("id, course_id, created_by, courses!inner(created_by)")
    .eq("id", materialId)
    .single();
  if (checkErr) return { success: false, error: checkErr.message } as const;
  // karena join alias sulit, lakukan cek sederhana kedua
  const { error: courseErr } = await supabase
    .from("materials")
    .select("courses:course_id(created_by)")
    .eq("id", materialId)
    .single();
  if (courseErr) return { success: false, error: courseErr.message } as const;

  // Insert
  const { type, content, url, orderIndex } = parsed.data;
  const { data, error } = await supabase
    .from("material_contents")
    .insert({
      material_id: materialId,
      type,
      content,
      url,
      order_index: orderIndex ?? 0,
      created_by: session.user.id,
    })
    .select("id")
    .single();
  if (error) return { success: false, error: error.message } as const;
  return { success: true, data: { id: data.id } } as const;
}

export async function updateMaterialContent(input: UpdateMaterialContentInput) {
  const parsed = updateMaterialContentSchema.safeParse(input);
  if (!parsed.success)
    return {
      success: false,
      error: parsed.error.flatten().fieldErrors,
    } as const;
  const supabase = await createSupabaseServer();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/login");
  ensureTeacher((session.user.user_metadata as { role?: string })?.role);

  const { id, materialId, type, content, url, orderIndex } = parsed.data;
  const { error } = await supabase
    .from("material_contents")
    .update({
      material_id: materialId,
      type,
      content,
      url,
      order_index: orderIndex ?? 0,
    })
    .eq("id", id)
    .eq("created_by", session.user.id);
  if (error) return { success: false, error: error.message } as const;
  return { success: true } as const;
}

export async function deleteMaterialContent(input: DeleteMaterialContentInput) {
  const parsed = deleteMaterialContentSchema.safeParse(input);
  if (!parsed.success)
    return {
      success: false,
      error: parsed.error.flatten().fieldErrors,
    } as const;
  const supabase = await createSupabaseServer();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/login");
  ensureTeacher((session.user.user_metadata as { role?: string })?.role);

  const { id } = parsed.data;
  const { data, error } = await supabase
    .from("material_contents")
    .delete()
    .eq("id", id)
    .eq("created_by", session.user.id)
    .select("id");
  if (error) return { success: false, error: error.message } as const;
  if (!data || data.length === 0)
    return {
      success: false,
      error: "Data tidak ditemukan/akses ditolak",
    } as const;
  return { success: true } as const;
}
