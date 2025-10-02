"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { createSupabaseClient } from "@/lib/supabase/client";

type RowBase = { id: string } & Record<string, unknown>;

export default function AssessmentLinksTeacher() {
  const [courseId, setCourseId] = useState("");
  const [materialId, setMaterialId] = useState("");
  const [courses, setCourses] = useState<RowBase[]>([]);
  const [materials, setMaterials] = useState<RowBase[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [loadingMaterials, setLoadingMaterials] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseClient();
    let isMounted = true;
    setLoadingCourses(true);
    (async () => {
      try {
        const { data } = await supabase.from("courses").select("*");
        if (isMounted) setCourses(data ?? []);
      } finally {
        if (isMounted) setLoadingCourses(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const supabase = createSupabaseClient();
    if (!courseId) {
      setMaterials([]);
      setMaterialId("");
      return;
    }
    let isMounted = true;
    setLoadingMaterials(true);
    (async () => {
      try {
        const { data } = await supabase
          .from("materials")
          .select("*")
          .eq("course_id", courseId);
        if (isMounted) setMaterials(data ?? []);
      } finally {
        if (isMounted) setLoadingMaterials(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [courseId]);

  const canGo = courseId && materialId;

  const base = canGo
    ? `/courses/${encodeURIComponent(courseId)}/materials/${encodeURIComponent(
        materialId
      )}/assessment`
    : "#";

  const labelOf = (row: RowBase) =>
    (row["title"] as string | undefined) ||
    (row["name"] as string | undefined) ||
    row.id;

  return (
    <div className="space-y-3">
      <div className="font-medium">Pembuatan & Penilaian Soal</div>
      <div className="grid md:grid-cols-2 gap-2">
        <select
          className="h-9 rounded-md border bg-transparent px-3"
          value={courseId}
          onChange={(e) => {
            setCourseId(e.target.value);
            setMaterialId("");
          }}>
          <option value="">
            {loadingCourses ? "Memuat kursus..." : "Pilih kursus"}
          </option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {labelOf(c)}
            </option>
          ))}
        </select>
        <select
          className="h-9 rounded-md border bg-transparent px-3"
          value={materialId}
          onChange={(e) => setMaterialId(e.target.value)}
          disabled={!courseId}>
          <option value="">
            {loadingMaterials
              ? "Memuat materi..."
              : courseId
              ? "Pilih materi"
              : "Pilih kursus dahulu"}
          </option>
          {materials.map((m) => (
            <option key={m.id} value={m.id}>
              {labelOf(m)}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button asChild disabled={!canGo}>
          <Link href={`${base}/builder`}>Buka Builder</Link>
        </Button>
        <Button asChild variant="outline" disabled={!canGo}>
          <Link href={`${base}/grading`}>Buka Penilaian</Link>
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        - Jenis soal: Pilihan Ganda & Esai. Atur waktu pengerjaan (menit) dan
        bobot nilai di halaman builder.
      </p>
    </div>
  );
}
