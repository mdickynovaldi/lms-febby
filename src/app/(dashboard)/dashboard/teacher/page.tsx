import { createSupabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AssessmentLinksTeacher from "./assessment-links";
import { CreateCourseForm, CreateMaterialForm } from "./create-forms";
import SignOutButton from "../sign-out-button";
import ManageCourses from "./manage-courses";
import ManageMaterials from "./manage-materials";

export default async function TeacherDashboardPage() {
  const supabase = await createSupabaseServer();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/login");
  const role = (session.user.user_metadata as { role?: string })?.role;
  if (role !== "teacher") redirect("/dashboard");

  const name = (session.user.user_metadata as { name?: string })?.name;
  const nim = (session.user.user_metadata as { nim?: string })?.nim;

  const { data: myCourse } = await supabase
    .from("courses")
    .select("id, title")
    .eq("created_by", session.user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <main className="p-8 space-y-4">
      <h1 className="text-2xl font-semibold">Dashboard Guru</h1>
      <div className="p-4 border rounded-md space-y-2">
        <div className="font-medium">Profil</div>
        <div className="text-sm">Nama: {name ?? "-"}</div>
        <div className="text-sm">nim: {nim ?? "-"}</div>
        <div className="text-sm">Email: {session.user.email ?? "-"}</div>
      </div>
      <SignOutButton />
      <div className="p-4 border rounded-md space-y-4">
        <div>Kelola kursus, materi, tugas, dan kuis.</div>
        <AssessmentLinksTeacher />
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <CreateCourseForm />
        {myCourse ? (
          <CreateMaterialForm courseId={myCourse.id} />
        ) : (
          <div className="p-4 border rounded-md text-sm text-muted-foreground">
            Buat kursus terlebih dahulu untuk membuat materi.
          </div>
        )}
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <ManageCourses />
        <ManageMaterials />
      </div>
    </main>
  );
}
