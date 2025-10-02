"use client";

import { z } from "zod";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createAssessmentSchema,
  type CreateAssessmentInput,
} from "@/lib/schemas/assessment";
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
import { createAssessment, updateAssessment } from "../actions";

type Props = {
  materialId: string;
  existing?: {
    id: string;
    title: string;
    description?: string;
    timeLimitMinutes: number;
    totalWeight: number;
  };
};

export default function CreateAssessmentForm({ materialId, existing }: Props) {
  const [isPending, startTransition] = useTransition();
  // Gunakan skema gabungan (id opsional) agar generic useForm tetap stabil
  const formSchema = createAssessmentSchema.extend({
    id: z.string().uuid().optional(),
  });

  type FormValues = CreateAssessmentInput & { id?: string };
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: existing
      ? {
          id: existing.id,
          materialId,
          title: existing.title,
          description: existing.description ?? "",
          timeLimitMinutes: existing.timeLimitMinutes,
          totalWeight: existing.totalWeight,
        }
      : {
          materialId,
          title: "",
          description: "",
          timeLimitMinutes: 0,
          totalWeight: 100,
        },
  });

  const onSubmit = (values: FormValues) => {
    startTransition(async () => {
      const { id, ...rest } = values;
      const res = await (existing
        ? updateAssessment({
            ...(rest as CreateAssessmentInput),
            id: id ?? existing.id,
          })
        : createAssessment(rest as CreateAssessmentInput));
      if (!res.success) {
        toast.error(
          typeof res.error === "string" ? res.error : "Gagal menyimpan"
        );
        return;
      }
      toast.success("Assessment tersimpan");
    });
  };

  return (
    <div className="p-4 border rounded-md">
      <h2 className="text-lg font-medium mb-2">Pengaturan Assessment</h2>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Judul</FormLabel>
                <FormControl>
                  <Input placeholder="Ujian Bab 1" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="timeLimitMinutes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Batas Waktu (menit)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    max={600}
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="totalWeight"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bobot Nilai</FormLabel>
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
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Deskripsi</FormLabel>
                <FormControl>
                  <Textarea
                    rows={4}
                    placeholder="Petunjuk pengerjaan..."
                    value={field.value ?? ""}
                    onChange={field.onChange}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <input
            type="hidden"
            value={materialId}
            {...form.register("materialId")}
          />
          {existing && (
            <input type="hidden" value={existing.id} {...form.register("id")} />
          )}

          <div className="md:col-span-2">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Menyimpan..." : "Simpan Pengaturan"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
