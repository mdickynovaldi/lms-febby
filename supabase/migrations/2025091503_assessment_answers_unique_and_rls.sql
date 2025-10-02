-- Unique indexes to support ON CONFLICT (submission_id, question_id)
create unique index if not exists uq_answers_mcq_submission_question
  on public.assessment_answers_mcq(submission_id, question_id);

create unique index if not exists uq_answers_essay_submission_question
  on public.assessment_answers_essay(submission_id, question_id);

-- RLS: allow student owners to update their own essay answers (for upsert)
drop policy if exists "answers_essay_update_student_owner" on public.assessment_answers_essay;
create policy "answers_essay_update_student_owner" on public.assessment_answers_essay
  for update to authenticated using (
    public.user_role() = 'student' and exists (
      select 1 from public.assessment_submissions s
      where s.id = submission_id and s.student_id = auth.uid()
    )
  );





