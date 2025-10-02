"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createSupabaseClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type MaterialChatProps = {
  materialId: string;
};

type UserRole = "teacher" | "student";

type Message = {
  id: string;
  material_id: string;
  sender_id: string;
  sender_name: string;
  sender_role?: UserRole | null;
  content: string;
  created_at: string;
};

export default function MaterialChat({ materialId }: MaterialChatProps) {
  const supabase = useMemo(() => createSupabaseClient(), []);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const roleCacheRef = useRef<Map<string, UserRole>>(new Map());
  const teacherIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Load initial messages
    let isMounted = true;
    (async () => {
      // Dapatkan teacherId (pemilik kursus) untuk fallback role "teacher"
      try {
        const { data: mat } = await supabase
          .from("materials")
          .select("course_id")
          .eq("id", materialId)
          .single();
        if (mat?.course_id) {
          const { data: courseRow } = await supabase
            .from("courses")
            .select("created_by")
            .eq("id", mat.course_id as string)
            .single();
          teacherIdRef.current =
            (courseRow as { created_by?: string } | null)?.created_by ?? null;
        }
      } catch {
        // abaikan jika gagal; fallback lain masih berlaku
      }

      const { data, error } = await supabase
        .from("material_messages")
        .select("id, material_id, sender_id, sender_name, content, created_at")
        .eq("material_id", materialId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) {
        toast.error(error.message);
        return;
      }
      // Enrich role via RPC bila belum ada pada baris (skema awal tidak punya kolom role)
      let rows = ((data ?? []) as Message[]).slice().reverse();
      const missingRoleUserIds = Array.from(
        new Set(
          rows
            .filter((r) => !("sender_role" in r) || r.sender_role == null)
            .map((r) => r.sender_id)
        )
      );
      if (missingRoleUserIds.length > 0) {
        const { data: metaRows } = await supabase.rpc("get_user_public_meta", {
          user_ids: missingRoleUserIds,
        });
        type PublicMeta = {
          id: string;
          name?: string | null;
          nim?: string | null;
          role?: string | null;
        };
        const metaList = (metaRows ?? []) as unknown as PublicMeta[];
        const metaById = new Map(metaList.map((m) => [m.id, m]));
        // isi cache dan enrich rows
        metaList.forEach((m) => {
          const role = (m.role ?? null) as UserRole | null;
          if (role) roleCacheRef.current.set(m.id, role);
        });
        rows = rows.map((r) => {
          const meta = metaById.get(r.sender_id) as PublicMeta | undefined;
          const roleFromMeta = (meta?.role as UserRole | undefined) ?? null;
          const fallbackRole: UserRole | null =
            roleFromMeta ??
            (meta?.nim && meta.nim.trim() !== "" ? "student" : null) ??
            (teacherIdRef.current && r.sender_id === teacherIdRef.current
              ? "teacher"
              : null);
          return {
            ...r,
            sender_role: fallbackRole ?? r.sender_role ?? null,
          };
        });
      }
      if (isMounted) {
        setMessages(rows);
        // scroll after first load
        setTimeout(
          () => bottomRef.current?.scrollIntoView({ behavior: "smooth" }),
          0
        );
      }
    })();

    // Realtime subscription
    const channel = supabase
      .channel(`material_messages:${materialId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "material_messages",
          filter: `material_id=eq.${materialId}`,
        },
        async (payload: unknown) => {
          const newRow = (payload as { new: Message }).new;
          let role: UserRole | null = newRow.sender_role ?? null;
          if (!role) {
            const cached = roleCacheRef.current.get(newRow.sender_id);
            if (cached) {
              role = cached;
            } else {
              const { data: metaOne } = await supabase.rpc(
                "get_user_public_meta",
                { user_ids: [newRow.sender_id] }
              );
              type PublicMeta = {
                id: string;
                name?: string | null;
                nim?: string | null;
                role?: string | null;
              };
              const r = ((metaOne ?? []) as unknown as PublicMeta[])[0];
              role =
                ((r?.role ?? null) as UserRole | null) ??
                (r?.nim && String(r.nim).trim() !== ""
                  ? ("student" as UserRole)
                  : null) ??
                (teacherIdRef.current &&
                newRow.sender_id === teacherIdRef.current
                  ? ("teacher" as UserRole)
                  : null);
              if (role) roleCacheRef.current.set(newRow.sender_id, role);
            }
          }
          setMessages((prev) => {
            const exists = prev.some((p) => p.id === newRow.id);
            if (exists) {
              return prev.map((p) =>
                p.id === newRow.id && p.sender_role == null && role
                  ? { ...p, sender_role: role }
                  : p
              );
            }
            return [...prev, { ...newRow, sender_role: role }];
          });
          setTimeout(
            () => bottomRef.current?.scrollIntoView({ behavior: "smooth" }),
            0
          );
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") return;
      });

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [materialId, supabase]);

  const handleSend = async () => {
    const value = input.trim();
    if (!value) return;
    setSending(true);
    try {
      const {
        data: { user },
        error: sessionError,
      } = await supabase.auth.getUser();
      if (sessionError) throw sessionError;
      if (!user) {
        toast.error("Harus login untuk mengirim pesan");
        return;
      }
      const senderName =
        (user.user_metadata as { name?: string } | undefined)?.name ??
        user.email?.split("@")[0] ??
        "Pengguna";

      // Insert dan ambil kembali row yang dibuat agar bisa ditampilkan langsung
      const { data: inserted, error } = await supabase
        .from("material_messages")
        .insert({
          material_id: materialId,
          sender_id: user.id,
          sender_name: senderName,
          content: value,
        })
        .select("id, material_id, sender_id, sender_name, content, created_at")
        .single();
      if (error) throw error;

      // Enrich role untuk pengirim saat ini (optimistic update)
      let role: UserRole | null = null;
      const cached = roleCacheRef.current.get(user.id);
      if (cached) {
        role = cached;
      } else {
        const { data: metaOne } = await supabase.rpc("get_user_public_meta", {
          user_ids: [user.id],
        });
        type PublicMeta = {
          id: string;
          name?: string | null;
          nim?: string | null;
          role?: string | null;
        };
        const r = ((metaOne ?? []) as unknown as PublicMeta[])[0];
        role =
          ((r?.role ?? null) as UserRole | null) ??
          (r?.nim && String(r.nim).trim() !== ""
            ? ("student" as UserRole)
            : null) ??
          (teacherIdRef.current && user.id === teacherIdRef.current
            ? ("teacher" as UserRole)
            : null);
        if (role) roleCacheRef.current.set(user.id, role);
      }

      setMessages((prev) => {
        const exists = prev.some((p) => p.id === (inserted as Message).id);
        if (exists) {
          return prev.map((p) =>
            p.id === (inserted as Message).id && p.sender_role == null
              ? { ...p, sender_role: role }
              : p
          );
        }
        return [...prev, { ...(inserted as Message), sender_role: role }];
      });
      setInput("");
      setTimeout(
        () => bottomRef.current?.scrollIntoView({ behavior: "smooth" }),
        0
      );
    } catch (e: unknown) {
      const err = e as { message?: string };
      toast.error(err.message ?? "Gagal mengirim pesan");
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  return (
    <section className="border rounded-md p-3 space-y-3">
      <header className="text-sm font-medium text-muted-foreground">
        Diskusi Materi (Realtime)
      </header>
      <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada pesan.</p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className="text-sm">
              <span className="font-medium">{m.sender_name}</span>
              {m.sender_role ? (
                <>
                  <span className="mx-1 text-muted-foreground">•</span>
                  <Badge
                    variant={
                      m.sender_role === "teacher" ? "secondary" : "outline"
                    }>
                    {m.sender_role === "teacher" ? "Guru" : "Siswa"}
                  </Badge>
                </>
              ) : null}
              <span className="mx-1 text-muted-foreground">•</span>
              <span className="text-foreground/80 break-words">
                {m.content}
              </span>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
      <div className="flex items-center gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Tulis pesan dan tekan Enter"
          disabled={sending}
        />
        <Button
          onClick={handleSend}
          disabled={sending || input.trim().length === 0}>
          Kirim
        </Button>
      </div>
    </section>
  );
}
