create extension if not exists pgcrypto;

-- Tables
create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  description text,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_materials_course_id on public.materials(course_id);

-- Trigger updated_at
create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

drop trigger if exists trg_courses_updated_at on public.courses;
create trigger trg_courses_updated_at before update on public.courses
for each row execute function public.set_updated_at();

drop trigger if exists trg_materials_updated_at on public.materials;
create trigger trg_materials_updated_at before update on public.materials
for each row execute function public.set_updated_at();

-- RLS
alter table public.courses enable row level security;
alter table public.materials enable row level security;

create or replace function public.user_role() returns text language sql stable as $$
  select coalesce((auth.jwt() -> 'user_metadata' ->> 'role'), '')::text;
$$;

-- Policies for courses
drop policy if exists "courses_select_all" on public.courses;
create policy "courses_select_all" on public.courses for select using (true);

drop policy if exists "courses_insert_teacher" on public.courses;
create policy "courses_insert_teacher" on public.courses for insert to authenticated with check (
  public.user_role() = 'teacher' and created_by = auth.uid()
);

drop policy if exists "courses_update_owner_teacher" on public.courses;
create policy "courses_update_owner_teacher" on public.courses for update to authenticated using (
  public.user_role() = 'teacher' and created_by = auth.uid()
);

drop policy if exists "courses_delete_owner_teacher" on public.courses;
create policy "courses_delete_owner_teacher" on public.courses for delete to authenticated using (
  public.user_role() = 'teacher' and created_by = auth.uid()
);

-- Policies for materials
drop policy if exists "materials_select_all" on public.materials;
create policy "materials_select_all" on public.materials for select using (true);

drop policy if exists "materials_insert_teacher_owner_course" on public.materials;
create policy "materials_insert_teacher_owner_course" on public.materials for insert to authenticated with check (
  public.user_role() = 'teacher' and created_by = auth.uid() and exists (
    select 1 from public.courses c where c.id = course_id and c.created_by = auth.uid()
  )
);

drop policy if exists "materials_update_teacher_owner_course" on public.materials;
create policy "materials_update_teacher_owner_course" on public.materials for update to authenticated using (
  public.user_role() = 'teacher' and created_by = auth.uid() and exists (
    select 1 from public.courses c where c.id = course_id and c.created_by = auth.uid()
  )
);

drop policy if exists "materials_delete_teacher_owner_course" on public.materials;
create policy "materials_delete_teacher_owner_course" on public.materials for delete to authenticated using (
  public.user_role() = 'teacher' and created_by = auth.uid() and exists (
    select 1 from public.courses c where c.id = course_id and c.created_by = auth.uid()
  )
);


