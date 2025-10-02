-- Add student identity columns to submissions
alter table public.assessment_submissions
  add column if not exists student_name text,
  add column if not exists student_nim text;

-- Optional: composite index to help teacher filter by student
create index if not exists idx_submissions_assessment_student on public.assessment_submissions(assessment_id, student_id);


