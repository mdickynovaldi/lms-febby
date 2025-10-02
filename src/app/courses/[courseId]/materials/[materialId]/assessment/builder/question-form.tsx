"use client";

import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { addQuestion } from "../actions";

const schema = z.object({
  assessmentId: z.string().uuid(),
  type: z.enum(["multiple_choice", "essay"]),
  prompt: z.string().min(1),
  points: z.number().int().min(1),
  options: z
    .array(z.object({ label: z.string().min(1), isCorrect: z.boolean() }))
    .optional(),
});

type FormValues = z.infer<typeof schema>;

export default function AddQuestionForm({
  assessmentId,
}: {
  assessmentId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [optionCount, setOptionCount] = useState(4);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      assessmentId,
      type: "multiple_choice",
      prompt: "",
      points: 1,
      options: Array.from({ length: 4 }, (_, i) => ({
        label: "",
        isCorrect: i === 0,
      })),
    },
  });

  const isMCQ = form.watch("type") === "multiple_choice";
  const options = form.watch("options");

  const onSubmit = (values: FormValues) => {
    startTransition(async () => {
      const res = await addQuestion(values);
      if (!res.success) {
        toast.error(
          typeof res.error === "string" ? res.error : "Gagal menambah soal"
        );
        return;
      }
      toast.success("Soal ditambahkan");
      form.reset({ ...form.getValues(), prompt: "", points: 1 });
    });
  };

  const optionFields = useMemo(
    () => Array.from({ length: optionCount }, (_, i) => i),
    [optionCount]
  );

  return (
    <div className="p-4 border rounded-md">
      <h3 className="font-medium mb-2">Tambah Soal</h3>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
          <div className="grid grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Jenis Soal</FormLabel>
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
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Pilihan jawaban
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setOptionCount((c) => {
                      const next = Math.max(2, c - 1);
                      const current = options ?? [];
                      const trimmed = current.slice(0, next);
                      // Pastikan ada satu jawaban benar tersisa
                      if (!trimmed.some((o) => o?.isCorrect)) {
                        if (trimmed[0]) trimmed[0].isCorrect = true;
                      }
                      form.setValue("options", trimmed, { shouldDirty: true });
                      return next;
                    })
                  }>
                  -
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setOptionCount((c) => {
                      const next = Math.min(8, c + 1);
                      const current = options ?? [];
                      const extended = [
                        ...current,
                        { label: "", isCorrect: false },
                      ].slice(0, next);
                      form.setValue("options", extended, { shouldDirty: true });
                      return next;
                    })
                  }>
                  +
                </Button>
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                {optionFields.map((i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="correct"
                      className="size-4"
                      checked={options?.[i]?.isCorrect ?? false}
                      onChange={() => {
                        const opts = optionFields.map((idx) => ({
                          label: options?.[idx]?.label ?? "",
                          isCorrect: idx === i,
                        }));
                        form.setValue("options", opts, { shouldDirty: true });
                      }}
                    />
                    <Input
                      placeholder={`Opsi ${i + 1}`}
                      value={options?.[i]?.label ?? ""}
                      onChange={(e) => {
                        const opts = optionFields.map((idx) => ({
                          label:
                            idx === i
                              ? e.target.value
                              : options?.[idx]?.label ?? "",
                          isCorrect: options?.[idx]?.isCorrect ?? false,
                        }));
                        form.setValue("options", opts, { shouldDirty: true });
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <input
            type="hidden"
            {...form.register("assessmentId")}
            value={assessmentId}
          />

          <div>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Menambah..." : "Tambah Soal"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
