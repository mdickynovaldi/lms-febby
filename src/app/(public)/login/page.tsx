"use client";

import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase/client";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Link from "next/link";
import { useEffect } from "react";

const schema = z.object({
  email: z.string().email("Email tidak valid"),
  password: z.string().min(6, "Minimal 6 karakter"),
  role: z.enum(["teacher", "student"], {
    error: "Pilih peran",
  }),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "", role: "student" },
  });

  useEffect(() => {
    // Jika sudah login, redirect ke dashboard
    const supabase = createSupabaseClient();
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace("/dashboard");
    });
  }, [router]);

  const onSubmit = async (values: FormValues) => {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    // Cegah perubahan role saat login. Validasi role akun harus sama dengan pilihan.
    const user = data.user;
    const userRole = (user?.user_metadata as { role?: string })?.role as
      | string
      | undefined;
    if (!userRole) {
      await supabase.auth.signOut();
      toast.error("Akun belum memiliki peran. Hubungi admin.");
      return;
    }
    if (userRole !== values.role) {
      await supabase.auth.signOut();
      toast.error(
        `Peran akun adalah ${userRole}. Tidak dapat login sebagai ${values.role}.`
      );
      return;
    }

    toast.success("Berhasil masuk");
    router.replace("/dashboard");
  };

  return (
    <main className="min-h-[70vh] flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold">Masuk</h1>
          <p className="text-muted-foreground text-sm">
            Guru sebagai admin, atau Siswa
          </p>
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="nama@email.com"
                      type="email"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kata sandi</FormLabel>
                  <FormControl>
                    <Input placeholder="••••••" type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Peran</FormLabel>
                  <FormControl>
                    <select
                      className="w-full border rounded-md h-10 px-3"
                      {...field}>
                      <option value="student">Siswa</option>
                      <option value="teacher">Guru (Admin)</option>
                    </select>
                  </FormControl>
                  <FormDescription>
                    Pilih peran sesuai akun Anda
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full"
              disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Memproses..." : "Masuk"}
            </Button>
          </form>
        </Form>

        <div className="text-center text-sm">
          <span className="text-muted-foreground">Belum punya akun? </span>
          <Link href="#" className="underline">
            Hubungi admin
          </Link>
        </div>
      </div>
    </main>
  );
}
