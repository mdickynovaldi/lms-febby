import { createSupabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const supabase = await createSupabaseServer();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const role = (session.user.user_metadata as { role?: string })?.role;
  if (role === "teacher") redirect("/dashboard/teacher");
  if (role === "student") redirect("/dashboard/student");

  redirect("/login");
}
