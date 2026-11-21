
-- Academia Studio platform modules: course resources, attendance, and private file storage.
create table if not exists public.course_materials (
 id uuid primary key default gen_random_uuid(),
 classroom_id uuid not null references public.classrooms(id) on delete cascade,
 uploaded_by uuid not null references auth.users(id) on delete cascade,
 title text not null,
 description text not null default '',
 file_path text, file_name text, mime_type text,
 created_at timestamptz not null default now()
);
alter table public.course_materials enable row level security;
create policy "course_materials_read_class" on public.course_materials for select to authenticated using (
 uploaded_by=(select auth.uid()) or exists(select 1 from public.classrooms c where c.id=classroom_id and c.teacher_id=(select auth.uid()))
 or exists(select 1 from public.classroom_members m where m.classroom_id=course_materials.classroom_id and m.student_id=(select auth.uid()))
);
create policy "course_materials_teacher_manage" on public.course_materials for all to authenticated using (
 exists(select 1 from public.classrooms c where c.id=classroom_id and c.teacher_id=(select auth.uid()))
) with check (
 uploaded_by=(select auth.uid()) and exists(select 1 from public.classrooms c where c.id=classroom_id and c.teacher_id=(select auth.uid()))
);
create table if not exists public.attendance_sessions (
 id uuid primary key default gen_random_uuid(),
 classroom_id uuid not null references public.classrooms(id) on delete cascade,
 created_by uuid not null references auth.users(id) on delete cascade,
 title text not null default 'Class attendance',
 session_date date not null default current_date,
 created_at timestamptz not null default now()
);
alter table public.attendance_sessions enable row level security;
create policy "attendance_sessions_related_read" on public.attendance_sessions for select to authenticated using (
 created_by=(select auth.uid()) or exists(select 1 from public.classrooms c where c.id=classroom_id and c.teacher_id=(select auth.uid()))
 or exists(select 1 from public.classroom_members m where m.classroom_id=attendance_sessions.classroom_id and m.student_id=(select auth.uid()))
);
create policy "attendance_sessions_teacher_manage" on public.attendance_sessions for all to authenticated using (
 exists(select 1 from public.classrooms c where c.id=classroom_id and c.teacher_id=(select auth.uid()))
) with check (
 created_by=(select auth.uid()) and exists(select 1 from public.classrooms c where c.id=classroom_id and c.teacher_id=(select auth.uid()))
);
create table if not exists public.attendance_records (
 id uuid primary key default gen_random_uuid(),
 session_id uuid not null references public.attendance_sessions(id) on delete cascade,
 student_id uuid not null references auth.users(id) on delete cascade,
 status text not null default 'present' check(status in ('present','absent','late','excused')),
 note text not null default '',
 marked_at timestamptz not null default now(),
 unique(session_id,student_id)
);
alter table public.attendance_records enable row level security;
create policy "attendance_records_student_or_teacher_read" on public.attendance_records for select to authenticated using (
 student_id=(select auth.uid()) or exists(select 1 from public.attendance_sessions s join public.classrooms c on c.id=s.classroom_id where s.id=session_id and c.teacher_id=(select auth.uid()))
);
create policy "attendance_records_teacher_manage" on public.attendance_records for all to authenticated using (
 exists(select 1 from public.attendance_sessions s join public.classrooms c on c.id=s.classroom_id where s.id=session_id and c.teacher_id=(select auth.uid()))
) with check (
 exists(select 1 from public.attendance_sessions s join public.classrooms c on c.id=s.classroom_id where s.id=session_id and c.teacher_id=(select auth.uid()))
);
alter table public.library_items add column if not exists file_path text;
alter table public.library_items add column if not exists file_name text;
alter table public.library_items add column if not exists mime_type text;
alter table public.library_items add column if not exists size_bytes bigint;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('academia-files','academia-files',false,52428800,array['application/pdf','image/png','image/jpeg','text/plain','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.presentationml.presentation','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create policy "academia_files_read_own" on storage.objects for select to authenticated using(bucket_id='academia-files' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy "academia_files_insert_own" on storage.objects for insert to authenticated with check(bucket_id='academia-files' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy "academia_files_update_own" on storage.objects for update to authenticated using(bucket_id='academia-files' and (storage.foldername(name))[1]=(select auth.uid())::text) with check(bucket_id='academia-files' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy "academia_files_delete_own" on storage.objects for delete to authenticated using(bucket_id='academia-files' and (storage.foldername(name))[1]=(select auth.uid())::text);
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;
revoke execute on function public.join_classroom(text) from public, anon;
grant execute on function public.join_classroom(text) to authenticated;
