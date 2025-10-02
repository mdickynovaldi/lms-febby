import { createSupabaseServer } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import MaterialChat from "@/components/materials/material-chat";

type Params = { params: { courseId: string; materialId: string } };

export default async function MaterialReadPage({ params }: Params) {
  const supabase = await createSupabaseServer();
  const { data: material } = await supabase
    .from("materials")
    .select("id, title, description")
    .eq("id", params.materialId)
    .single();
  if (!material) notFound();

  const { data: contents } = await supabase
    .from("material_contents")
    .select("id, type, content, url, order_index")
    .eq("material_id", params.materialId)
    .order("order_index", { ascending: true });

  return (
    <main className="p-6 mx-auto max-w-3xl space-y-6">
      <article className="space-y-4">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold">{material.title}</h1>
          {material.description ? (
            <p className="text-muted-foreground">{material.description}</p>
          ) : null}
        </header>
        <div className="prose prose-neutral dark:prose-invert max-w-none">
          {(contents ?? []).map((c) => {
            if (c.type === "text") {
              return (
                <div key={c.id} className="whitespace-pre-line">
                  {c.content}
                </div>
              );
            }
            if (c.type === "image" && c.url) {
              // eslint-disable-next-line @next/next/no-img-element
              return (
                <img
                  key={c.id}
                  src={c.url}
                  alt="Gambar materi"
                  className="rounded-md"
                />
              );
            }
            if (c.type === "pdf" && c.url) {
              return (
                <iframe
                  key={c.id}
                  src={c.url}
                  className="w-full h-[600px] rounded-md border"
                  title="Dokumen PDF"
                />
              );
            }
            if (c.type === "youtube" && c.url) {
              const embedUrl = toYouTubeEmbedUrl(c.url);
              return (
                <iframe
                  key={c.id}
                  className="w-full aspect-video rounded-md border"
                  src={embedUrl}
                  title="Video YouTube"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              );
            }
            if (c.type === "link" && c.url) {
              return (
                <p key={c.id}>
                  <a
                    className="underline"
                    href={c.url}
                    target="_blank"
                    rel="noreferrer">
                    {c.url}
                  </a>
                </p>
              );
            }
            return null;
          })}
        </div>
      </article>
      <MaterialChat materialId={params.materialId} />
    </main>
  );
}

function toYouTubeEmbedUrl(url: string) {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) {
      const id = u.pathname.replace("/", "");
      return `https://www.youtube.com/embed/${id}`;
    }
    if (u.hostname.includes("youtube.com")) {
      const id = u.searchParams.get("v");
      if (id) return `https://www.youtube.com/embed/${id}`;
      // format /embed/{id}
      const parts = u.pathname.split("/");
      const idx = parts.indexOf("embed");
      if (idx >= 0 && parts[idx + 1])
        return `https://www.youtube.com/embed/${parts[idx + 1]}`;
    }
  } catch (e) {
    // ignore
  }
  return url;
}
