create extension if not exists pgcrypto;

-- Konten materi: mendukung beberapa jenis konten dalam satu materi
create table if not exists public.material_contents (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references public.materials(id) on delete cascade,
  type text not null check (type in ('text','image','pdf','link','youtube')),
  -- payload fleksibel per tipe
  content text, -- digunakan untuk type 'text'
  url text,     -- digunakan untuk image/pdf/link/youtube
  order_index int not null default 0,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_material_contents_material_id
  on public.material_contents(material_id);

-- Trigger updated_at
create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

drop trigger if exists trg_material_contents_updated_at on public.material_contents;
create trigger trg_material_contents_updated_at before update on public.material_contents
for each row execute function public.set_updated_at();

-- RLS
alter table public.material_contents enable row level security;

-- Guru pemilik course/material dapat mengelola konten
drop policy if exists "material_contents_select_all" on public.material_contents;
create policy "material_contents_select_all" on public.material_contents for select using (true);

drop policy if exists "material_contents_insert_teacher_owner" on public.material_contents;
create policy "material_contents_insert_teacher_owner" on public.material_contents for insert to authenticated with check (
  public.user_role() = 'teacher' and created_by = auth.uid() and exists (
    select 1 from public.materials m join public.courses c on c.id = m.course_id
    where m.id = material_id and c.created_by = auth.uid()
  )
);

drop policy if exists "material_contents_update_teacher_owner" on public.material_contents;
create policy "material_contents_update_teacher_owner" on public.material_contents for update to authenticated using (
  public.user_role() = 'teacher' and created_by = auth.uid() and exists (
    select 1 from public.materials m join public.courses c on c.id = m.course_id
    where m.id = material_id and c.created_by = auth.uid()
  )
);

drop policy if exists "material_contents_delete_teacher_owner" on public.material_contents;
create policy "material_contents_delete_teacher_owner" on public.material_contents for delete to authenticated using (
  public.user_role() = 'teacher' and created_by = auth.uid() and exists (
    select 1 from public.materials m join public.courses c on c.id = m.course_id
    where m.id = material_id and c.created_by = auth.uid()
  )
);


