"use client";

import { useEffect, useState, useTransition } from "react";
import { createSupabaseClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { addMaterialContent, deleteMaterialContent } from "./actions";

type ContentRow = {
  id: string;
  material_id: string;
  type: "text" | "image" | "pdf" | "link" | "youtube";
  content: string | null;
  url: string | null;
  order_index: number;
};

export default function MaterialContentsManager({
  materialId,
}: {
  materialId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [rows, setRows] = useState<ContentRow[]>([]);
  const [adding, setAdding] = useState<
    Partial<{
      type: ContentRow["type"];
      content: string;
      url: string;
      orderIndex: number;
    }>
  >({ type: "text", content: "", url: "", orderIndex: 0 });

  useEffect(() => {
    const supabase = createSupabaseClient();
    supabase
      .from("material_contents")
      .select("id, material_id, type, content, url, order_index")
      .eq("material_id", materialId)
      .order("order_index", { ascending: true })
      .then(({ data }) => setRows((data ?? []) as ContentRow[]));
  }, [materialId]);

  const onAdd = () => {
    const values = adding;
    if (!values.type) return;
    startTransition(async () => {
      const res: Awaited<ReturnType<typeof addMaterialContent>> =
        await addMaterialContent({
          materialId,
          type: values.type!,
          content: values.type === "text" ? values.content ?? "" : null,
          url: values.type !== "text" ? values.url ?? "" : null,
          orderIndex: Number(values.orderIndex ?? 0),
        });
      if (!res.success) {
        toast.error(
          typeof res.error === "string" ? res.error : "Gagal menambah konten"
        );
        return;
      }
      toast.success("Konten ditambahkan");
      setRows((r) => [
        ...r,
        {
          id: res.data.id,
          material_id: materialId,
          type: values.type!,
          content: values.type === "text" ? values.content ?? null : null,
          url: values.type !== "text" ? values.url ?? null : null,
          order_index: Number(values.orderIndex ?? 0),
        },
      ]);
      setAdding({ type: "text", content: "", url: "", orderIndex: 0 });
    });
  };

  const onDelete = (id: string) => {
    if (!confirm("Hapus konten ini?")) return;
    startTransition(async () => {
      const res = await deleteMaterialContent({ id });
      if (!res.success) {
        toast.error(
          typeof res.error === "string" ? res.error : "Gagal menghapus konten"
        );
        return;
      }
      toast.success("Konten dihapus");
      setRows((list) => list.filter((x) => x.id !== id));
    });
  };

  return (
    <div className="space-y-3">
      <div className="font-medium">Konten Materi</div>
      <ul className="space-y-2">
        {rows.map((r) => (
          <li
            key={r.id}
            className="border rounded-md p-2 flex items-start justify-between gap-3">
            <div className="text-sm space-y-1">
              <div className="font-medium">
                {r.type.toUpperCase()} #{r.order_index}
              </div>
              {r.type === "text" ? (
                <div className="text-muted-foreground whitespace-pre-line">
                  {r.content}
                </div>
              ) : (
                <div className="text-muted-foreground break-all">{r.url}</div>
              )}
            </div>
            <div>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => onDelete(r.id)}
                disabled={isPending}>
                Hapus
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <div className="border rounded-md p-3 space-y-2">
        <div className="font-medium">Tambah Konten</div>
        <div className="grid md:grid-cols-2 gap-2">
          <select
            className="h-9 rounded-md border bg-transparent px-3"
            value={adding.type}
            onChange={(e) =>
              setAdding((s) => ({
                ...s,
                type: e.target.value as ContentRow["type"],
              }))
            }>
            <option value="text">Teks</option>
            <option value="image">Gambar (URL)</option>
            <option value="pdf">PDF (URL)</option>
            <option value="link">Tautan</option>
            <option value="youtube">YouTube URL</option>
          </select>
          <Input
            type="number"
            className="h-9"
            value={Number(adding.orderIndex ?? 0)}
            onChange={(e) =>
              setAdding((s) => ({
                ...s,
                orderIndex: Number(e.target.value || 0),
              }))
            }
            placeholder="Urutan"
          />
        </div>
        {adding.type === "text" ? (
          <Textarea
            rows={5}
            value={adding.content ?? ""}
            onChange={(e) =>
              setAdding((s) => ({ ...s, content: e.target.value }))
            }
            placeholder="Tulis konten teks di sini"
          />
        ) : (
          <Input
            value={adding.url ?? ""}
            onChange={(e) => setAdding((s) => ({ ...s, url: e.target.value }))}
            placeholder="Tempel URL (gambar/pdf/link/youtube)"
          />
        )}
        <div>
          <Button onClick={onAdd} disabled={isPending}>
            {isPending ? "Menambah..." : "Tambah Konten"}
          </Button>
        </div>
      </div>
    </div>
  );
}
