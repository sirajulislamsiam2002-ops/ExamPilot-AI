-- Secure runtime, autosave, automatic MCQ scoring and teacher evaluation.
-- Requires 202611210001_classrooms_and_exams.sql.
alter table public.exam_attempts
  add column if not exists auto_score numeric(8,2),
  add column if not exists manual_score numeric(8,2),
  add column if not exists feedback text,
  add column if not exists evaluated_at timestamptz;

create or replace function public.calculate_exam_auto_score(p_exam_id uuid,p_answers jsonb)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(q.marks),0)
  from public.exam_questions q
  join public.exam_answer_keys k on k.question_id=q.id
  join lateral (select p_answers->q.id::text as answer) a on true
  where q.exam_id=p_exam_id and q.question_type='mcq'
    and lower(trim(coalesce(a.answer->>'answer','')))=lower(trim(coalesce(k.answer_key->>'answer','')));
$$;
revoke all on function public.calculate_exam_auto_score(uuid,jsonb) from public;

create or replace function public.start_exam_attempt(p_exam_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$$
declare
  v_exam public.classroom_exams%rowtype;
  v_attempt public.exam_attempts%rowtype;
begin
  if auth.uid() is null then raise exception 'Sign in is required'; end if;
  if not exists (select 1 from public.profiles p where p.id=auth.uid() and p.role='student') then
    raise exception 'Only student accounts can take exams';
  end if;
  select * into v_exam from public.classroom_exams where id=p_exam_id and status='published';
  if v_exam.id is null then raise exception 'Exam is not available'; end if;
  if v_exam.starts_at is not null and now()<v_exam.starts_at then raise exception 'Exam has not started yet'; end if;
  if v_exam.ends_at is not null and now()>v_exam.ends_at then raise exception 'Exam has ended'; end if;
  if not exists (
    select 1 from public.classroom_members m
    where m.classroom_id=v_exam.classroom_id and m.student_id=auth.uid() and m.status='approved'
  ) then raise exception 'You are not an approved member of this classroom'; end if;

  insert into public.exam_attempts(exam_id,student_id)
  values(p_exam_id,auth.uid())
  on conflict(exam_id,student_id) do nothing;

  select * into v_attempt from public.exam_attempts
  where exam_id=p_exam_id and student_id=auth.uid();
  if v_attempt.status<>'in_progress' then
    return jsonb_build_object('attempt_id',v_attempt.id,'status',v_attempt.status,
      'answers',v_attempt.answers,'started_at',v_attempt.started_at,
      'submitted_at',v_attempt.submitted_at,'score',v_attempt.score,
      'total_marks',v_attempt.total_marks,'feedback',v_attempt.feedback);
  end if;
  if now()>v_attempt.started_at+make_interval(mins=>v_exam.duration_minutes)
     or (v_exam.ends_at is not null and now()>v_exam.ends_at) then
    perform set_config('app.exam_rpc','true',true);
    update public.exam_attempts set status='submitted',submitted_at=now(),
      answers=v_attempt.answers,auto_score=public.calculate_exam_auto_score(p_exam_id,v_attempt.answers),
      score=public.calculate_exam_auto_score(p_exam_id,v_attempt.answers),
      total_marks=(select coalesce(sum(q.marks),0) from public.exam_questions q where q.exam_id=p_exam_id)
    where id=v_attempt.id returning * into v_attempt;
  end if;
  return jsonb_build_object('attempt_id',v_attempt.id,'status',v_attempt.status,
    'answers',v_attempt.answers,'started_at',v_attempt.started_at,
    'submitted_at',v_attempt.submitted_at,'score',v_attempt.score,
    'total_marks',v_attempt.total_marks,'feedback',v_attempt.feedback);
end;
$$$;

create or replace function public.save_exam_attempt(p_attempt_id uuid,p_answers jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$$
declare
  v_attempt public.exam_attempts%rowtype;
  v_exam public.classroom_exams%rowtype;
begin
  select * into v_attempt from public.exam_attempts
  where id=p_attempt_id and student_id=auth.uid() for update;
  if v_attempt.id is null then raise exception 'Exam attempt not found'; end if;
  if v_attempt.status<>'in_progress' then raise exception 'This exam attempt is no longer editable'; end if;
  select * into v_exam from public.classroom_exams where id=v_attempt.exam_id;
  if now()>v_attempt.started_at+make_interval(mins=>v_exam.duration_minutes)
     or (v_exam.ends_at is not null and now()>v_exam.ends_at) then
    perform set_config('app.exam_rpc','true',true);
    update public.exam_attempts set status='submitted',submitted_at=now(),
      auto_score=public.calculate_exam_auto_score(v_exam.id,v_attempt.answers),
      score=public.calculate_exam_auto_score(v_exam.id,v_attempt.answers),
      total_marks=(select coalesce(sum(q.marks),0) from public.exam_questions q where q.exam_id=v_exam.id)
    where id=v_attempt.id returning * into v_attempt;
    return jsonb_build_object('status',v_attempt.status,'submitted_at',v_attempt.submitted_at);
  end if;
  if jsonb_typeof(p_answers)<>'object' then raise exception 'Answers must be an object'; end if;
  update public.exam_attempts set answers=p_answers where id=v_attempt.id returning * into v_attempt;
  return jsonb_build_object('status',v_attempt.status,'saved_at',now());
end;
$$$;

create or replace function public.submit_exam_attempt(p_attempt_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$$
declare
  v_attempt public.exam_attempts%rowtype;
  v_exam public.classroom_exams%rowtype;
  v_auto numeric(8,2);
  v_total numeric(8,2);
begin
  select * into v_attempt from public.exam_attempts
  where id=p_attempt_id and student_id=auth.uid() for update;
  if v_attempt.id is null then raise exception 'Exam attempt not found'; end if;
  if v_attempt.status<>'in_progress' then
    return jsonb_build_object('status',v_attempt.status,'score',v_attempt.score,'total_marks',v_attempt.total_marks);
  end if;
  select * into v_exam from public.classroom_exams where id=v_attempt.exam_id;
  select coalesce(sum(q.marks),0) into v_total
  from public.exam_questions q where q.exam_id=v_exam.id;
  v_auto:=public.calculate_exam_auto_score(v_exam.id,v_attempt.answers);
  perform set_config('app.exam_rpc','true',true);
  update public.exam_attempts set status='submitted',submitted_at=now(),
    auto_score=v_auto,score=v_auto,total_marks=v_total
  where id=v_attempt.id returning * into v_attempt;
  return jsonb_build_object('status',v_attempt.status,'score',v_attempt.score,
    'total_marks',v_attempt.total_marks,'submitted_at',v_attempt.submitted_at);
end;
$$$;

create or replace function public.evaluate_exam_attempt(
  p_attempt_id uuid,p_manual_score numeric,p_feedback text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$$
declare
  v_attempt public.exam_attempts%rowtype;
  v_exam public.classroom_exams%rowtype;
  v_written_total numeric(8,2);
  v_auto numeric(8,2);
begin
  select * into v_attempt from public.exam_attempts where id=p_attempt_id for update;
  if v_attempt.id is null then raise exception 'Exam attempt not found'; end if;
  select * into v_exam from public.classroom_exams where id=v_attempt.exam_id;
  if not (v_exam.teacher_id=auth.uid() or public.is_admin()) then
    raise exception 'Only the classroom teacher can evaluate this attempt';
  end if;
  if v_attempt.status not in ('submitted','evaluated') then raise exception 'Student has not submitted this exam'; end if;
  select coalesce(sum(q.marks),0) into v_written_total
  from public.exam_questions q where q.exam_id=v_exam.id and q.question_type<>'mcq';
  if p_manual_score<0 or p_manual_score>v_written_total then
    raise exception 'Manual score must be between zero and the written-question total';
  end if;
  v_auto:=coalesce(v_attempt.auto_score,0);
  perform set_config('app.exam_rpc','true',true);
  update public.exam_attempts set manual_score=p_manual_score,
    score=v_auto+p_manual_score,feedback=coalesce(p_feedback,''),
    status='evaluated',evaluated_at=now()
  where id=v_attempt.id returning * into v_attempt;
  return jsonb_build_object('status',v_attempt.status,'score',v_attempt.score,
    'total_marks',v_attempt.total_marks,'feedback',v_attempt.feedback);
end;
$$$;

revoke all on function public.start_exam_attempt(uuid) from public;
revoke all on function public.save_exam_attempt(uuid,jsonb) from public;
revoke all on function public.submit_exam_attempt(uuid) from public;
revoke all on function public.evaluate_exam_attempt(uuid,numeric,text) from public;
grant execute on function public.start_exam_attempt(uuid) to authenticated;
grant execute on function public.save_exam_attempt(uuid,jsonb) to authenticated;
grant execute on function public.submit_exam_attempt(uuid) to authenticated;
grant execute on function public.evaluate_exam_attempt(uuid,numeric,text) to authenticated;

-- Attempt answer keys stay private; students can only retrieve their own attempt rows.
