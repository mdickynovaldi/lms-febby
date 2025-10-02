"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createSupabaseClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

type Material = { id: string; title: string };

export function CourseCard({
  courseId,
  title,
}: {
  courseId: string;
  title: string;
}) {
  const [materials, setMaterials] = useState<Material[]>([]);
  useEffect(() => {
    const supabase = createSupabaseClient();
    supabase
      .from("materials")
      .select("id, title")
      .eq("course_id", courseId)
      .order("created_at", { ascending: false })
      .then(({ data }) => setMaterials((data ?? []) as Material[]));
  }, [courseId]);

  return (
    <div className="border rounded-md p-4 space-y-3">
      <div>
        <div className="text-lg font-semibold">{title}</div>
        <div className="text-sm text-muted-foreground">Daftar materi</div>
      </div>
      <ul className="space-y-2">
        {materials.map((m) => (
          <li key={m.id} className="border rounded-md p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="font-medium">{m.title}</div>
              <div className="flex gap-2">
                <Button asChild size="sm">
                  <Link
                    href={`/courses/${encodeURIComponent(
                      courseId
                    )}/materials/${encodeURIComponent(m.id)}`}>
                    Baca Materi
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link
                    href={`/courses/${encodeURIComponent(
                      courseId
                    )}/materials/${encodeURIComponent(
                      m.id
                    )}/assessment/attempt`}>
                    Mengerjakan Soal
                  </Link>
                </Button>
                <Button asChild size="sm" variant="secondary">
                  <Link
                    href={`/courses/${encodeURIComponent(
                      courseId
                    )}/materials/${encodeURIComponent(
                      m.id
                    )}/assessment/result`}>
                    Nilai & Feedback
                  </Link>
                </Button>
              </div>
            </div>
          </li>
        ))}
        {materials.length === 0 ? (
          <li className="text-sm text-muted-foreground">Belum ada materi.</li>
        ) : null}
      </ul>
    </div>
  );
}
