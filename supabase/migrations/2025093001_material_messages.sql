-- Tabel pesan chat per materi
create table if not exists public.material_messages (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references public.materials(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  sender_name text not null,
  content text not null check (length(trim(content)) > 0),
  created_at timestamptz not null default now()
);

create index if not exists idx_material_messages_material_id
  on public.material_messages(material_id, created_at desc);

-- RLS
alter table public.material_messages enable row level security;

-- Helper function (diasumsikan sudah ada user_role(); jika belum, sesuaikan)
-- Izinkan baca/akses jika user adalah pembuat kursus terkait atau terdaftar sebagai peserta
-- Konsisten dengan materials_select_all: izinkan semua pengguna melihat pesan
create policy "material_messages_select_all" on public.material_messages
  for select using (true);

create policy "insert messages authenticated users" on public.material_messages
  for insert to authenticated with check (
    sender_id = auth.uid() and exists (
      select 1 from public.materials m where m.id = material_id
    )
  );

create policy "delete own messages or teacher" on public.material_messages
  for delete using (
    sender_id = auth.uid() or exists (
      select 1
      from public.materials m
      join public.courses c on c.id = m.course_id
      where m.id = material_id and c.created_by = auth.uid()
    )
  );

-- Realtime publication
do $$ begin
  perform 1 from pg_publication where pubname = 'supabase_realtime';
  if found then
    execute 'alter publication supabase_realtime add table public.material_messages';
  end if;
end $$;


