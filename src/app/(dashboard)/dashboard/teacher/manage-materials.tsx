"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createSupabaseClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { updateMaterialAction, deleteMaterial } from "./actions";
import MaterialContentsManager from "./material-contents-manager";

type MaterialRow = {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
};

export default function ManageMaterials() {
  const [isPending, startTransition] = useTransition();
  const [materials, setMaterials] = useState<MaterialRow[]>([]);
  const [courses, setCourses] = useState<{ id: string; title: string }[]>([]);
  const [editing, setEditing] = useState<Record<string, boolean>>({});
  const [formState, setFormState] = useState<
    Record<string, { title: string; description: string; courseId: string }>
  >({});
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createSupabaseClient();
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id ?? "";
      const [{ data: mats }, { data: crs }] = await Promise.all([
        supabase
          .from("materials")
          .select(
            "id, course_id, title, description, created_at, updated_at, created_by"
          )
          .eq("created_by", userId)
          .order("created_at", { ascending: false }),
        supabase
          .from("courses")
          .select("id, title")
          .eq("created_by", userId)
          .order("created_at", { ascending: false }),
      ]);
      const matRows = (mats ?? []) as unknown as MaterialRow[];
      const courseRows = (crs ?? []) as unknown as {
        id: string;
        title: string;
      }[];
      setMaterials(matRows);
      setCourses(courseRows);
      setFormState(
        Object.fromEntries(
          (matRows ?? []).map((m) => [
            m.id,
            {
              title: m.title,
              description: m.description ?? "",
              courseId: m.course_id,
            },
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
      const res = await updateMaterialAction({
        id,
        courseId: values.courseId,
        title: values.title,
        description: values.description || null,
      });
      if (!res.success) {
        toast.error(
          typeof res.error === "string" ? res.error : "Gagal mengubah materi"
        );
        return;
      }
      toast.success("Materi diperbarui");
      setEditing((e) => ({ ...e, [id]: false }));
    });
  };

  const onDelete = (id: string) => {
    if (!confirm("Hapus materi ini? Assessment terkait juga akan terhapus."))
      return;
    startTransition(async () => {
      const res = await deleteMaterial({ id });
      if (!res.success) {
        toast.error(
          typeof res.error === "string" ? res.error : "Gagal menghapus materi"
        );
        return;
      }
      toast.success("Materi dihapus");
      setMaterials((rows) => rows.filter((r) => r.id !== id));
      router.refresh();
    });
  };

  return (
    <section className="p-4 border rounded-md space-y-3">
      <h2 className="text-lg font-medium">Kelola Materi Saya</h2>
      <ul className="space-y-3">
        {materials.map((m) => (
          <li key={m.id} className="border rounded-md p-3 space-y-2">
            {!editing[m.id] ? (
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium">{m.title}</div>
                  {m.description ? (
                    <div className="text-sm text-muted-foreground">
                      {m.description}
                    </div>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/courses/${m.course_id}/materials/${m.id}`}>
                      Lihat
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditing((e) => ({ ...e, [m.id]: true }))}>
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => onDelete(m.id)}
                    disabled={isPending}>
                    Hapus
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="grid md:grid-cols-2 gap-3">
                  <Input
                    value={formState[m.id]?.title ?? ""}
                    onChange={(e) =>
                      setFormState((s) => ({
                        ...s,
                        [m.id]: { ...s[m.id], title: e.target.value },
                      }))
                    }
                    placeholder="Judul materi"
                  />
                  <select
                    className="h-9 rounded-md border bg-transparent px-3"
                    value={formState[m.id]?.courseId ?? ""}
                    onChange={(e) =>
                      setFormState((s) => ({
                        ...s,
                        [m.id]: { ...s[m.id], courseId: e.target.value },
                      }))
                    }>
                    <option value="">Pilih kursus</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </div>
                <Textarea
                  value={formState[m.id]?.description ?? ""}
                  onChange={(e) =>
                    setFormState((s) => ({
                      ...s,
                      [m.id]: { ...s[m.id], description: e.target.value },
                    }))
                  }
                  rows={3}
                  placeholder="Deskripsi"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => onSave(m.id)}
                    disabled={isPending}>
                    {isPending ? "Menyimpan..." : "Simpan"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditing((e) => ({ ...e, [m.id]: false }))}
                    disabled={isPending}>
                    Batal
                  </Button>
                </div>
                <div className="pt-3 border-t">
                  <MaterialContentsManager materialId={m.id} />
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
