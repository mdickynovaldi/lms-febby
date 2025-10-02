"use client";

import { useEffect, useState } from "react";
import { createSupabaseClient } from "@/lib/supabase/client";
import { CourseCard } from "@/components/course/course-card";

type Course = { id: string; title: string };

export default function AssessmentLinksStudent() {
  const [courses, setCourses] = useState<Course[]>([]);
  useEffect(() => {
    const supabase = createSupabaseClient();
    supabase
      .from("courses")
      .select("id, title")
      .then(({ data }) => setCourses((data ?? []) as Course[]));
  }, []);

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        Pilih kursus dan materi melalui kartu di bawah ini. Tampilan membaca
        materi seperti blog.
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {courses.map((c) => (
          <CourseCard key={c.id} courseId={c.id} title={c.title} />
        ))}
      </div>
    </div>
  );
}
