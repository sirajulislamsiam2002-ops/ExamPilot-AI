-- Private cloud notes for each Academia Studio account.
create table if not exists public.student_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Untitled note' check (char_length(title) between 1 and 180),
  content text not null default '',
  labels text[] not null default '{}',
  pinned boolean not null default false,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.student_notes enable row level security;
drop policy if exists student_notes_read_own on public.student_notes;
create policy student_notes_read_own on public.student_notes for select using (user_id=auth.uid());
drop policy if exists student_notes_insert_own on public.student_notes;
create policy student_notes_insert_own on public.student_notes for insert with check (user_id=auth.uid());
drop policy if exists student_notes_update_own on public.student_notes;
create policy student_notes_update_own on public.student_notes for update using (user_id=auth.uid()) with check (user_id=auth.uid());
drop policy if exists student_notes_delete_own on public.student_notes;
create policy student_notes_delete_own on public.student_notes for delete using (user_id=auth.uid());
create index if not exists student_notes_owner_updated_idx on public.student_notes(user_id,updated_at desc);
