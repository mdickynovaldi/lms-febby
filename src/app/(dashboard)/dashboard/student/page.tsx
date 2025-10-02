import { createSupabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import SignOutButton from "@/app/(dashboard)/dashboard/sign-out-button";
import AssessmentLinksStudent from "./assessment-links";

export default async function StudentDashboardPage() {
  const supabase = await createSupabaseServer();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/login");
  const role = (session.user.user_metadata as { role?: string })?.role;
  if (role !== "student") redirect("/dashboard");

  const name = (session.user.user_metadata as { name?: string })?.name;
  const nim = (session.user.user_metadata as { nim?: string })?.nim;

  return (
    <main className="p-8 space-y-4">
      <h1 className="text-2xl font-semibold">Dashboard Siswa</h1>
      <div className="p-4 border rounded-md space-y-2">
        <div className="font-medium">Profil</div>
        <div className="text-sm">Nama: {name ?? "-"}</div>
        <div className="text-sm">Absen: {nim ?? "-"}</div>
        <div className="text-sm">Email: {session.user.email ?? "-"}</div>
      </div>
      <div className="p-4 border rounded-md space-y-4">
        <div>Akses kursus, materi, tugas, dan kuis Anda.</div>
        <AssessmentLinksStudent />
      </div>
      <SignOutButton />
    </main>
  );
}
