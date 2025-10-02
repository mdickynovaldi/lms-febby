"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { updateQuestion, deleteQuestion } from "../actions";

const schema = z.object({
  id: z.string().uuid(),
  assessmentId: z.string().uuid(),
  type: z.enum(["multiple_choice", "essay"]),
  prompt: z.string().min(1).max(2000),
  points: z.number().int().min(1).max(1000),
  options: z
    .array(
      z.object({ label: z.string().min(1).max(500), isCorrect: z.boolean() })
    )
    .optional(),
});

type FormValues = z.infer<typeof schema>;

type Option = { label: string; isCorrect: boolean };

export default function QuestionItem(props: {
  question: {
    id: string;
    assessmentId: string;
    type: "multiple_choice" | "essay";
    prompt: string;
    points: number;
  };
  options?: { label: string; isCorrect: boolean }[];
}) {
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const router = useRouter();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      id: props.question.id,
      assessmentId: props.question.assessmentId,
      type: props.question.type,
      prompt: props.question.prompt,
      points: props.question.points,
      options: props.options,
    },
  });

  const isMCQ = form.watch("type") === "multiple_choice";
  const options = form.watch("options") ?? [];

  const onSave = (values: FormValues) => {
    startTransition(async () => {
      const res = await updateQuestion(values);
      if (!res.success) {
        toast.error(
          typeof res.error === "string" ? res.error : "Gagal menyimpan soal"
        );
        return;
      }
      toast.success("Soal diperbarui");
      setEditing(false);
    });
  };

  const onDelete = () => {
    if (!confirm("Hapus soal ini?")) return;
    startTransition(async () => {
      const res = await deleteQuestion({ id: props.question.id });
      if (!res.success) {
        toast.error(
          typeof res.error === "string" ? res.error : "Gagal menghapus soal"
        );
        return;
      }
      toast.success("Soal dihapus");
      router.refresh();
    });
  };

  if (!editing) {
    return (
      <div className="p-3 border rounded-md">
        <div className="text-sm text-muted-foreground">
          {props.question.type}
        </div>
        <div className="font-medium">{props.question.prompt}</div>
        <div className="text-sm">Poin: {props.question.points}</div>
        <div className="flex gap-2 mt-2">
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            Edit
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={onDelete}
            disabled={isPending}>
            Hapus
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 border rounded-md">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSave)} className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Jenis</FormLabel>
                  <FormControl>
                    <select
                      className="h-9 rounded-md border bg-transparent px-3"
                      value={field.value}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value as "multiple_choice" | "essay"
                        )
                      }>
                      <option value="multiple_choice">Pilihan Ganda</option>
                      <option value="essay">Esai</option>
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="points"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Poin</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={1000}
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="prompt"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Pertanyaan</FormLabel>
                <FormControl>
                  {isMCQ ? (
                    <Input placeholder="Teks pertanyaan" {...field} />
                  ) : (
                    <Textarea
                      rows={3}
                      placeholder="Teks pertanyaan"
                      {...field}
                    />
                  )}
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {isMCQ && (
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">
                Pilihan Jawaban
              </div>
              <div className="space-y-2">
                {(options as Option[]).map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`correct-${form.getValues("id")}`}
                      className="size-4"
                      checked={opt.isCorrect}
                      onChange={() => {
                        const next = (options as Option[]).map((o, idx) => ({
                          label: o.label,
                          isCorrect: idx === i,
                        }));
                        form.setValue("options", next, { shouldDirty: true });
                      }}
                    />
                    <Input
                      value={opt.label}
                      onChange={(e) => {
                        const next = (options as Option[]).map((o, idx) => ({
                          label: idx === i ? e.target.value : o.label,
                          isCorrect: o.isCorrect,
                        }));
                        form.setValue("options", next, { shouldDirty: true });
                      }}
                      placeholder={`Opsi ${i + 1}`}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <input type="hidden" {...form.register("id")} />
          <input type="hidden" {...form.register("assessmentId")} />

          <div className="flex gap-2">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Menyimpan..." : "Simpan"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditing(false)}
              disabled={isPending}>
              Batal
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
