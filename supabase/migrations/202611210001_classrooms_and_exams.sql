-- Classroom and assessment foundation for Academia Studio
create extension if not exists pgcrypto;

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('student','teacher','admin'));

-- Only an administrator can assign teacher/admin roles.
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);
create policy profiles_admin_update on public.profiles for update
  using (public.is_admin()) with check (public.is_admin());

create or replace function public.prevent_self_role_change()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'Only an administrator can change account roles';
  end if;
  return new;
end;
$$;
drop trigger if exists profiles_role_guard on public.profiles;
create trigger profiles_role_guard before update on public.profiles
for each row execute function public.prevent_self_role_change();

create table if not exists public.classrooms (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 120),
  description text not null default '',
  classroom_code text not null unique default upper(encode(gen_random_bytes(5),'hex')),
  approval_required boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.classroom_invites (
  classroom_id uuid primary key references public.classrooms(id) on delete cascade,
  invite_token text not null unique default encode(gen_random_bytes(20),'hex'),
  created_at timestamptz not null default now()
);
alter table public.classroom_invites enable row level security;
create policy classroom_invite_teacher_read on public.classroom_invites for select
using (exists (select 1 from public.classrooms c where c.id = classroom_id and c.teacher_id = auth.uid()) or public.is_admin());

create or replace function public.create_classroom_invite()
returns trigger language plpgsql security definer set search_path = public
as $$ begin insert into public.classroom_invites(classroom_id) values(new.id); return new; end; $$;
drop trigger if exists classroom_invite_on_create on public.classrooms;
create trigger classroom_invite_on_create after insert on public.classrooms
for each row execute function public.create_classroom_invite();

create or replace function public.get_classroom_invite(p_classroom_id uuid)
returns text language plpgsql security definer set search_path = public
as $$
declare v_token text;
begin
  select i.invite_token into v_token
  from public.classroom_invites i join public.classrooms c on c.id=i.classroom_id
  where c.id=p_classroom_id and (c.teacher_id=auth.uid() or public.is_admin());
  if v_token is null then raise exception 'Classroom not found or access denied'; end if;
  return v_token;
end;
$$;
revoke all on function public.get_classroom_invite(uuid) from public;
grant execute on function public.get_classroom_invite(uuid) to authenticated;

create table if not exists public.classroom_members (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  joined_at timestamptz not null default now(),
  reviewed_at timestamptz,
  unique(classroom_id, student_id)
);

create table if not exists public.classroom_exams (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  teacher_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 2 and 160),
  instructions text not null default '',
  starts_at timestamptz,
  ends_at timestamptz,
  duration_minutes integer not null default 30 check (duration_minutes between 1 and 360),
  status text not null default 'draft' check (status in ('draft','published','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (starts_at is null or ends_at is null or ends_at > starts_at)
);

create table if not exists public.exam_questions (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.classroom_exams(id) on delete cascade,
  question_order integer not null default 1,
  question_type text not null check (question_type in ('mcq','short','written')),
  prompt text not null,
  options jsonb not null default '[]'::jsonb,
  marks numeric(7,2) not null default 1 check (marks > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.exam_attempts (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.classroom_exams(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  status text not null default 'in_progress' check (status in ('in_progress','submitted','evaluated')),
  answers jsonb not null default '{}'::jsonb,
  score numeric(8,2),
  total_marks numeric(8,2),
  unique(exam_id, student_id)
);

alter table public.classrooms enable row level security;
alter table public.classroom_members enable row level security;
alter table public.classroom_exams enable row level security;
alter table public.exam_questions enable row level security;
create table if not exists public.exam_answer_keys (
  question_id uuid primary key references public.exam_questions(id) on delete cascade,
  answer_key jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.exam_answer_keys enable row level security;
create policy answer_key_teacher_only on public.exam_answer_keys for all
using (exists (
  select 1 from public.exam_questions q join public.classroom_exams e on e.id=q.exam_id
  where q.id=question_id and (e.teacher_id=auth.uid() or public.is_admin())
))
with check (exists (
  select 1 from public.exam_questions q join public.classroom_exams e on e.id=q.exam_id
  where q.id=question_id and (e.teacher_id=auth.uid() or public.is_admin())
));

alter table public.exam_attempts enable row level security;

-- Classroom owners and approved members can read their classroom.
create policy classroom_read_teacher_or_member on public.classrooms for select
using (teacher_id = auth.uid() or exists (
  select 1 from public.classroom_members m
  where m.classroom_id = id and m.student_id = auth.uid() and m.status = 'approved'
) or public.is_admin());
create policy classroom_read_pending_member on public.classrooms for select
using (exists (
  select 1 from public.classroom_members m
  where m.classroom_id = id and m.student_id = auth.uid() and m.status in ('pending','approved')
));
create policy classroom_insert_teacher on public.classrooms for insert
with check (teacher_id = auth.uid() and (
  public.is_admin() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'teacher')
));
create policy classroom_update_teacher on public.classrooms for update
using (teacher_id = auth.uid() or public.is_admin())
with check (teacher_id = auth.uid() or public.is_admin());
create policy classroom_delete_teacher on public.classrooms for delete
using (teacher_id = auth.uid() or public.is_admin());

create policy member_read_teacher_or_self on public.classroom_members for select
using (student_id = auth.uid() or exists (
  select 1 from public.classrooms c where c.id = classroom_id and c.teacher_id = auth.uid()
) or public.is_admin());
create policy member_update_teacher on public.classroom_members for update
using (exists (select 1 from public.classrooms c where c.id = classroom_id and c.teacher_id = auth.uid()) or public.is_admin())
with check (exists (select 1 from public.classrooms c where c.id = classroom_id and c.teacher_id = auth.uid()) or public.is_admin());
create policy member_delete_teacher_or_self on public.classroom_members for delete
using (student_id = auth.uid() or exists (
  select 1 from public.classrooms c where c.id = classroom_id and c.teacher_id = auth.uid()
) or public.is_admin());

-- Membership is created through the join RPC only, never by direct client insert.
create or replace function public.join_classroom(p_code text default null, p_invite_token text default null)
returns table(classroom_id uuid, classroom_name text, membership_status text)
language plpgsql security definer set search_path = public
as $$
declare
  v_classroom public.classrooms%rowtype;
  v_status text;
begin
  if auth.uid() is null then raise exception 'Sign in is required to join a classroom'; end if;
  if not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'student') then
    raise exception 'Only student accounts can join classrooms';
  end if;
  select * into v_classroom from public.classrooms c
    where c.is_active and (
      (p_code is not null and upper(c.classroom_code) = upper(trim(p_code))) or
      (p_invite_token is not null and exists (select 1 from public.classroom_invites i where i.classroom_id=c.id and i.invite_token=trim(p_invite_token)))
    ) limit 1;
  if v_classroom.id is null then raise exception 'Classroom code or invitation link is invalid'; end if;
  v_status := case when v_classroom.approval_required then 'pending' else 'approved' end;
  insert into public.classroom_members(classroom_id,student_id,status)
    values(v_classroom.id,auth.uid(),v_status)
    on conflict(classroom_id,student_id) do update set
      status = case when classroom_members.status = 'rejected' then excluded.status else classroom_members.status end
    returning status into v_status;
  return query select v_classroom.id,v_classroom.name,v_status;
end;
$$;
revoke all on function public.join_classroom(text,text) from public;
grant execute on function public.join_classroom(text,text) to authenticated;

create policy exam_read_authorized on public.classroom_exams for select
using (teacher_id = auth.uid() or public.is_admin() or (
  status = 'published' and exists (
    select 1 from public.classroom_members m
    where m.classroom_id = public.classroom_exams.classroom_id and m.student_id = auth.uid() and m.status = 'approved'
  )
));
create policy exam_insert_teacher on public.classroom_exams for insert
with check (teacher_id = auth.uid() and exists (
  select 1 from public.classrooms c where c.id = classroom_id and c.teacher_id = auth.uid()
));
create policy exam_update_teacher on public.classroom_exams for update
using (teacher_id = auth.uid() or public.is_admin())
with check (teacher_id = auth.uid() or public.is_admin());
create policy exam_delete_teacher on public.classroom_exams for delete
using (teacher_id = auth.uid() or public.is_admin());

-- Students may read questions only for an exam they are authorized to take.
create policy question_read_exam_owner_or_member on public.exam_questions for select
using (exists (
  select 1 from public.classroom_exams e
  where e.id = exam_id and (
    e.teacher_id = auth.uid() or public.is_admin() or (
      e.status = 'published' and exists (
        select 1 from public.classroom_members m
        where m.classroom_id = e.classroom_id and m.student_id = auth.uid() and m.status = 'approved'
      )
    )
  )
));
create policy question_manage_teacher on public.exam_questions for all
using (exists (select 1 from public.classroom_exams e where e.id = exam_id and e.teacher_id = auth.uid()) or public.is_admin())
with check (exists (select 1 from public.classroom_exams e where e.id = exam_id and e.teacher_id = auth.uid()) or public.is_admin());

create policy attempt_read_owner_teacher on public.exam_attempts for select
using (student_id = auth.uid() or exists (
  select 1 from public.classroom_exams e where e.id = exam_id and e.teacher_id = auth.uid()
) or public.is_admin());
create policy attempt_insert_eligible_student on public.exam_attempts for insert
with check (student_id = auth.uid() and exists (
  select 1 from public.classroom_exams e
  join public.classroom_members m on m.classroom_id = e.classroom_id
  where e.id = exam_id and e.status = 'published' and m.student_id = auth.uid() and m.status = 'approved'
));
create policy attempt_update_student_or_teacher on public.exam_attempts for update
using (student_id = auth.uid() or exists (
  select 1 from public.classroom_exams e where e.id = exam_id and e.teacher_id = auth.uid()
) or public.is_admin())
with check (student_id = auth.uid() or exists (
  select 1 from public.classroom_exams e where e.id = exam_id and e.teacher_id = auth.uid()
) or public.is_admin());

create index if not exists classroom_teacher_idx on public.classrooms(teacher_id);
create index if not exists classroom_member_student_idx on public.classroom_members(student_id,status);
create index if not exists classroom_exam_class_idx on public.classroom_exams(classroom_id,status);
create index if not exists exam_attempt_student_idx on public.exam_attempts(student_id,exam_id);

-- Prevent students from changing grades or modifying an attempt after submission.
create or replace function public.guard_exam_attempt_updates()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() = old.student_id and not public.is_admin() then
    if new.student_id is distinct from old.student_id
      or new.exam_id is distinct from old.exam_id
      or new.score is distinct from old.score
      or new.total_marks is distinct from old.total_marks then
      raise exception 'Students cannot change attempt ownership or marks';
    end if;
    if old.status <> 'in_progress' then
      raise exception 'Submitted exam attempts cannot be edited';
    end if;
    if new.status not in ('in_progress','submitted') then
      raise exception 'Invalid student attempt status';
    end if;
    if new.status = 'submitted' and new.submitted_at is null then
      new.submitted_at := now();
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists exam_attempt_update_guard on public.exam_attempts;
create trigger exam_attempt_update_guard before update on public.exam_attempts
for each row execute function public.guard_exam_attempt_updates();

-- Server-side attempt start and deadline enforcement.
create or replace function public.guard_exam_attempt_insert()
returns trigger language plpgsql security definer set search_path = public
as $$
declare v_exam public.classroom_exams%rowtype;
begin
  select * into v_exam from public.classroom_exams where id=new.exam_id;
  if v_exam.id is null or v_exam.status <> 'published' then raise exception 'This exam is not available'; end if;
  if v_exam.starts_at is not null and now() < v_exam.starts_at then raise exception 'This exam has not started yet'; end if;
  if v_exam.ends_at is not null and now() > v_exam.ends_at then raise exception 'This exam has ended'; end if;
  new.started_at := now();
  new.submitted_at := null;
  new.status := 'in_progress';
  new.score := null;
  new.total_marks := null;
  return new;
end;
$$;
drop trigger if exists exam_attempt_start_guard on public.exam_attempts;
create trigger exam_attempt_start_guard before insert on public.exam_attempts
for each row execute function public.guard_exam_attempt_insert();

create or replace function public.guard_exam_attempt_updates()
returns trigger language plpgsql security definer set search_path = public
as $$
declare v_exam public.classroom_exams%rowtype;
begin
  -- Only the trusted SECURITY DEFINER RPCs set this transaction-local flag.
  if current_setting('app.exam_rpc',true) = 'true' then return new; end if;
  if auth.uid() = old.student_id and not public.is_admin() then
    if new.student_id is distinct from old.student_id
      or new.exam_id is distinct from old.exam_id
      or new.score is distinct from old.score
      or new.total_marks is distinct from old.total_marks
      or new.started_at is distinct from old.started_at then
      raise exception 'Students cannot change attempt ownership, start time or marks';
    end if;
    if old.status <> 'in_progress' then raise exception 'Submitted exam attempts cannot be edited'; end if;
    if new.status not in ('in_progress','submitted') then raise exception 'Invalid student attempt status'; end if;
    select * into v_exam from public.classroom_exams where id=old.exam_id;
    if now() > old.started_at + make_interval(mins => v_exam.duration_minutes)
      or (v_exam.ends_at is not null and now() > v_exam.ends_at) then
      new.answers := old.answers;
      new.status := 'submitted';
    end if;
    if new.status = 'submitted' then new.submitted_at := now(); else new.submitted_at := null; end if;
  end if;
  return new;
end;
$$;
