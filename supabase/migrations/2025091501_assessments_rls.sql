-- Enable RLS
alter table public.assessments enable row level security;
alter table public.assessment_questions enable row level security;
alter table public.question_options enable row level security;
alter table public.assessment_submissions enable row level security;
alter table public.assessment_answers_mcq enable row level security;
alter table public.assessment_answers_essay enable row level security;

-- Helpers: role from auth.jwt()
create or replace function public.user_role() returns text language sql stable as $$
  select coalesce((auth.jwt() -> 'user_metadata' ->> 'role'), '')::text;
$$;

-- Policies: assessments (teacher owns)
create policy "assessments_select_owner_or_public" on public.assessments
  for select using (true);

create policy "assessments_insert_teacher" on public.assessments
  for insert to authenticated with check (
    public.user_role() = 'teacher' and created_by = auth.uid()
  );

create policy "assessments_update_owner_teacher" on public.assessments
  for update to authenticated using (
    public.user_role() = 'teacher' and created_by = auth.uid()
  );

create policy "assessments_delete_owner_teacher" on public.assessments
  for delete to authenticated using (
    public.user_role() = 'teacher' and created_by = auth.uid()
  );

-- Questions
create policy "questions_select_public" on public.assessment_questions for select using (true);
create policy "questions_insert_owner_teacher" on public.assessment_questions
  for insert to authenticated with check (
    public.user_role() = 'teacher' and exists (
      select 1 from public.assessments a where a.id = assessment_id and a.created_by = auth.uid()
    )
  );
create policy "questions_update_owner_teacher" on public.assessment_questions
  for update to authenticated using (
    public.user_role() = 'teacher' and exists (
      select 1 from public.assessments a where a.id = assessment_id and a.created_by = auth.uid()
    )
  );

create policy "questions_delete_owner_teacher" on public.assessment_questions
  for delete to authenticated using (
    public.user_role() = 'teacher' and exists (
      select 1 from public.assessments a where a.id = assessment_id and a.created_by = auth.uid()
    )
  );

-- Options
create policy "options_select_public" on public.question_options for select using (true);
create policy "options_insert_owner_teacher" on public.question_options
  for insert to authenticated with check (
    public.user_role() = 'teacher' and exists (
      select 1 from public.assessment_questions q join public.assessments a on a.id = q.assessment_id
      where q.id = question_id and a.created_by = auth.uid()
    )
  );
create policy "options_update_owner_teacher" on public.question_options
  for update to authenticated using (
    public.user_role() = 'teacher' and exists (
      select 1 from public.assessment_questions q join public.assessments a on a.id = q.assessment_id
      where q.id = question_id and a.created_by = auth.uid()
    )
  );

create policy "options_delete_owner_teacher" on public.question_options
  for delete to authenticated using (
    public.user_role() = 'teacher' and exists (
      select 1 from public.assessment_questions q join public.assessments a on a.id = q.assessment_id
      where q.id = question_id and a.created_by = auth.uid()
    )
  );

-- Submissions (student owns rows)
create policy "submissions_select_owner_or_teacher" on public.assessment_submissions
  for select using (
    student_id = auth.uid() or public.user_role() = 'teacher'
  );
create policy "submissions_insert_student" on public.assessment_submissions
  for insert to authenticated with check (
    public.user_role() = 'student' and student_id = auth.uid()
  );
create policy "submissions_update_owner_student_or_teacher_grade" on public.assessment_submissions
  for update to authenticated using (
    (public.user_role() = 'student' and student_id = auth.uid()) or public.user_role() = 'teacher'
  );

-- Answers MCQ
create policy "answers_mcq_select_owner_or_teacher" on public.assessment_answers_mcq for select using (
  exists (select 1 from public.assessment_submissions s where s.id = submission_id and (s.student_id = auth.uid() or public.user_role() = 'teacher'))
);
create policy "answers_mcq_upsert_student_owner" on public.assessment_answers_mcq for insert to authenticated with check (
  public.user_role() = 'student' and exists (select 1 from public.assessment_submissions s where s.id = submission_id and s.student_id = auth.uid())
);
create policy "answers_mcq_update_student_owner" on public.assessment_answers_mcq for update to authenticated using (
  public.user_role() = 'student' and exists (select 1 from public.assessment_submissions s where s.id = submission_id and s.student_id = auth.uid())
);

-- Answers Essay
create policy "answers_essay_select_owner_or_teacher" on public.assessment_answers_essay for select using (
  exists (select 1 from public.assessment_submissions s where s.id = submission_id and (s.student_id = auth.uid() or public.user_role() = 'teacher'))
);
create policy "answers_essay_insert_student_owner" on public.assessment_answers_essay for insert to authenticated with check (
  public.user_role() = 'student' and exists (select 1 from public.assessment_submissions s where s.id = submission_id and s.student_id = auth.uid())
);
create policy "answers_essay_update_teacher_only" on public.assessment_answers_essay for update to authenticated using (
  public.user_role() = 'teacher'
);


