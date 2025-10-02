import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createSupabaseServer } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createSupabaseServer();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="px-6">
      {/* Hero Section */}
      <section className="relative mx-auto max-w-6xl pt-20 pb-16 md:pt-28 md:pb-20">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="mx-auto max-w-3xl text-center space-y-5">
          <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs text-muted-foreground bg-secondary">
            Platform LMS Fisika
          </span>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            Selamat datang di BELMAFIS
            <span className="block bg-gradient-to-b from-foreground to-foreground/60 bg-clip-text text-transparent">
              Belajar Makna Fisika secara mendalam dan aplikatif
            </span>
          </h1>
          <p className="text-muted-foreground text-base md:text-lg">
            Jelajahi materi interaktif, kerjakan penilaian secara otomatis, dan
            diskusikan fenomena fisika dengan cara yang bermakna.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button asChild size="lg">
              <Link href="/login">Masuk</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/register">Daftar gratis</Link>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground pt-2">
            Pengembang: Febi Dwi Putri · Prof. Dr. Endang Purwaningsih, M.Si ·
            Prof. Dr. Sunaryono, M.Si
          </p>
        </div>
        <div className="mx-auto mt-10 grid max-w-4xl grid-cols-3 gap-4 opacity-90">
          <div className="flex items-center justify-center rounded-xl border bg-card/60 p-4">
            <Image src="/globe.svg" alt="Globe" width={40} height={40} />
          </div>
          <div className="flex items-center justify-center rounded-xl border bg-card/60 p-4">
            <Image src="/window.svg" alt="Window" width={40} height={40} />
          </div>
          <div className="flex items-center justify-center rounded-xl border bg-card/60 p-4">
            <Image src="/file.svg" alt="File" width={40} height={40} />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="mx-auto max-w-6xl pb-20">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <div className="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <span className="text-lg">📚</span>
              </div>
              <CardTitle>Materi Interaktif</CardTitle>
              <CardDescription>
                Materi disajikan dengan penjelasan bermakna, contoh nyata, dan
                pendekatan konseptual.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Pelajari konsep inti dengan visualisasi dan analogi yang mudah
              dipahami.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div className="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <span className="text-lg">🧮</span>
              </div>
              <CardTitle>Penilaian Otomatis</CardTitle>
              <CardDescription>
                Kuis dan tugas dengan umpan balik langsung untuk memantau
                pemahaman.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Kerjakan latihan dan dapatkan skor secara instan sehingga belajar
              lebih terarah.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div className="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <span className="text-lg">💬</span>
              </div>
              <CardTitle>Diskusi & Kolaborasi</CardTitle>
              <CardDescription>
                Ruang diskusi untuk bertanya, berbagi ide, dan mengaitkan fisika
                dengan fenomena sehari-hari.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Bangun pemahaman lebih dalam melalui percakapan yang bermakna.
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
