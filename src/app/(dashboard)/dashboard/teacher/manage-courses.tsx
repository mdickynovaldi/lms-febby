"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { updateCourse, deleteCourse } from "./actions";

type CourseRow = {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
};

export default function ManageCourses() {
  const [isPending, startTransition] = useTransition();
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [editing, setEditing] = useState<Record<string, boolean>>({});
  const [formState, setFormState] = useState<
    Record<string, { title: string; description: string }>
  >({});
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createSupabaseClient();
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id ?? "";
      const { data } = await supabase
        .from("courses")
        .select("id, title, description, created_at, updated_at, created_by")
        .eq("created_by", userId)
        .order("created_at", { ascending: false });
      const rows = (data ?? []) as unknown as CourseRow[];
      setCourses(rows);
      setFormState(
        Object.fromEntries(
          (rows ?? []).map((c) => [
            c.id,
            { title: c.title, description: c.description ?? "" },
          ])
        )
      );
    };
    fetchData();
  }, []);

  const onSave = (id: string) => {
    const values = formState[id];
    if (!values) return;
    startTransition(async () => {
      const res = await updateCourse({
        id,
        title: values.title,
        description: values.description || null,
      });
      if (!res.success) {
        toast.error(
          typeof res.error === "string" ? res.error : "Gagal mengubah kursus"
        );
        return;
      }
      toast.success("Kursus diperbarui");
      setEditing((e) => ({ ...e, [id]: false }));
    });
  };

  const onDelete = (id: string) => {
    if (!confirm("Hapus kursus ini? Materi terkait juga akan terhapus."))
      return;
    startTransition(async () => {
      const res = await deleteCourse({ id });
      if (!res.success) {
        toast.error(
          typeof res.error === "string" ? res.error : "Gagal menghapus kursus"
        );
        return;
      }
      toast.success("Kursus dihapus");
      setCourses((rows) => rows.filter((r) => r.id !== id));
      router.refresh();
    });
  };

  return (
    <section className="p-4 border rounded-md space-y-3">
      <h2 className="text-lg font-medium">Kelola Kursus Saya</h2>
      <ul className="space-y-3">
        {courses.map((c) => (
          <li key={c.id} className="border rounded-md p-3 space-y-2">
            {!editing[c.id] ? (
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium">{c.title}</div>
                  {c.description ? (
                    <div className="text-sm text-muted-foreground">
                      {c.description}
                    </div>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditing((e) => ({ ...e, [c.id]: true }))}>
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => onDelete(c.id)}
                    disabled={isPending}>
                    Hapus
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Input
                  value={formState[c.id]?.title ?? ""}
                  onChange={(e) =>
                    setFormState((s) => ({
                      ...s,
                      [c.id]: { ...s[c.id], title: e.target.value },
                    }))
                  }
                  placeholder="Judul kursus"
                />
                <Textarea
                  value={formState[c.id]?.description ?? ""}
                  onChange={(e) =>
                    setFormState((s) => ({
                      ...s,
                      [c.id]: { ...s[c.id], description: e.target.value },
                    }))
                  }
                  rows={3}
                  placeholder="Deskripsi"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => onSave(c.id)}
                    disabled={isPending}>
                    {isPending ? "Menyimpan..." : "Simpan"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditing((e) => ({ ...e, [c.id]: false }))}
                    disabled={isPending}>
                    Batal
                  </Button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
