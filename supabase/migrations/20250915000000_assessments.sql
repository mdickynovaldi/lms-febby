create extension if not exists pgcrypto;

-- Assessments core tables
create table if not exists public.assessments (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null,
  title text not null,
  description text,
  time_limit_minutes int not null default 0,
  total_weight int not null default 100,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.assessment_questions (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  type text not null check (type in ('multiple_choice','essay')),
  prompt text not null,
  points int not null check (points > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.question_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.assessment_questions(id) on delete cascade,
  label text not null,
  is_correct boolean not null default false
);

create table if not exists public.assessment_submissions (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  status text not null check (status in ('in_progress','submitted','graded')) default 'in_progress',
  score_raw numeric,
  final_score numeric,
  duration_seconds int
);

create table if not exists public.assessment_answers_mcq (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.assessment_submissions(id) on delete cascade,
  question_id uuid not null references public.assessment_questions(id) on delete cascade,
  selected_option_id uuid not null references public.question_options(id) on delete restrict,
  is_correct boolean,
  score numeric
);

create table if not exists public.assessment_answers_essay (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.assessment_submissions(id) on delete cascade,
  question_id uuid not null references public.assessment_questions(id) on delete cascade,
  essay_text text not null,
  score numeric,
  feedback text
);

-- Basic indexes
create index if not exists idx_assessment_questions_assessment_id on public.assessment_questions(assessment_id);
create index if not exists idx_question_options_question_id on public.question_options(question_id);
create index if not exists idx_submissions_assessment_id on public.assessment_submissions(assessment_id);
create index if not exists idx_submissions_student_id on public.assessment_submissions(student_id);
create index if not exists idx_answers_mcq_submission_id on public.assessment_answers_mcq(submission_id);
create index if not exists idx_answers_essay_submission_id on public.assessment_answers_essay(submission_id);

-- Trigger to maintain updated_at
create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

drop trigger if exists trg_assessments_updated_at on public.assessments;
create trigger trg_assessments_updated_at before update on public.assessments
for each row execute function public.set_updated_at();

-- NOTE: Tambahkan RLS & policies sesuai kebutuhan keamanan proyek Anda.



