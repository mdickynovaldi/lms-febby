"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";

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
import {
  createCourseSchema,
  createMaterialSchema,
  type CreateCourseInput,
  type CreateMaterialInput,
} from "@/lib/schemas/course-material";
import { createCourse, createMaterial } from "./actions";

export function CreateCourseForm() {
  const [isPending, startTransition] = useTransition();
  const form = useForm<CreateCourseInput>({
    resolver: zodResolver(createCourseSchema),
    defaultValues: { title: "", description: "" },
  });

  const onSubmit = (values: CreateCourseInput) => {
    startTransition(async () => {
      const res = await createCourse(values);
      if (!res.success) {
        toast.error(
          typeof res.error === "string" ? res.error : "Gagal membuat kursus"
        );
        return;
      }
      toast.success("Kursus dibuat");
      form.reset();
    });
  };

  return (
    <div className="p-4 border rounded-md">
      <h2 className="text-lg font-medium mb-2">Buat Kursus</h2>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Judul</FormLabel>
                <FormControl>
                  <Input placeholder="Fisika Kelas X" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Deskripsi</FormLabel>
                <FormControl>
                  <Textarea
                    rows={3}
                    placeholder="Deskripsi singkat"
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Membuat..." : "Buat Kursus"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

export function CreateMaterialForm({ courseId }: { courseId: string }) {
  const [isPending, startTransition] = useTransition();
  const form = useForm<CreateMaterialInput>({
    resolver: zodResolver(createMaterialSchema),
    defaultValues: { courseId, title: "", description: "" },
  });

  const onSubmit = (values: CreateMaterialInput) => {
    startTransition(async () => {
      const res = await createMaterial(values);
      if (!res.success) {
        toast.error(
          typeof res.error === "string" ? res.error : "Gagal membuat materi"
        );
        return;
      }
      toast.success("Materi dibuat");
      form.reset({ ...form.getValues(), title: "", description: "" });
    });
  };

  return (
    <div className="p-4 border rounded-md">
      <h2 className="text-lg font-medium mb-2">Buat Materi</h2>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
          <input type="hidden" {...form.register("courseId")} />
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Judul</FormLabel>
                <FormControl>
                  <Input placeholder="Hukum Newton" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Deskripsi</FormLabel>
                <FormControl>
                  <Textarea
                    rows={3}
                    placeholder="Ringkasan materi"
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Membuat..." : "Buat Materi"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
