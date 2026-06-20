-- =============================================
-- ProjectFlow — Supabase SQL Schema
-- Run this in your Supabase SQL Editor
-- =============================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type app_role as enum ('admin', 'manager', 'team_member');
  end if;
end
$$;

-- ─────────────────────────────────────────────
-- PROFILES
-- ─────────────────────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  phone       text,
  avatar_path text,
  role        app_role not null default 'team_member',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ─────────────────────────────────────────────
-- PROJECTS
-- ─────────────────────────────────────────────
create table if not exists public.projects (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  description text,
  owner_id    uuid references auth.users(id) on delete cascade not null default auth.uid(),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- Auto-update updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists projects_updated_at on public.projects;
create trigger projects_updated_at
  before update on public.projects
  for each row execute procedure public.handle_updated_at();

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();

-- ─────────────────────────────────────────────
-- TASKS
-- ─────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from pg_type where typname = 'task_status') then
    create type task_status as enum ('todo', 'in_progress', 'in_review', 'done');
  end if;

  if not exists (select 1 from pg_type where typname = 'task_priority') then
    create type task_priority as enum ('low', 'medium', 'high');
  end if;
end
$$;

create table if not exists public.tasks (
  id          uuid primary key default uuid_generate_v4(),
  project_id  uuid references public.projects(id) on delete cascade not null,
  title       text not null,
  description text,
  status      task_status default 'todo',
  priority    task_priority default 'medium',
  due_date    date,
  assigned_to uuid references auth.users(id) on delete set null,
  created_by  uuid references auth.users(id) default auth.uid(),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create table if not exists public.project_members (
  id          uuid primary key default uuid_generate_v4(),
  project_id  uuid references public.projects(id) on delete cascade not null,
  user_id     uuid references auth.users(id) on delete cascade not null,
  created_at  timestamptz default now(),
  unique (project_id, user_id)
);

drop trigger if exists tasks_updated_at on public.tasks;
create trigger tasks_updated_at
  before update on public.tasks
  for each row execute procedure public.handle_updated_at();

create or replace function public.current_app_role()
returns app_role
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role from public.profiles where id = auth.uid()),
    'team_member'::app_role
  );
$$;

create or replace function public.can_access_project(target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.projects project
    where project.id = target_project_id
      and (
        project.owner_id = auth.uid()
        or public.current_app_role() = 'admin'::app_role
        or exists (
          select 1
          from public.project_members member
          where member.project_id = project.id
            and member.user_id = auth.uid()
        )
      )
  );
$$;

create or replace function public.can_manage_project(target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.projects project
    where project.id = target_project_id
      and (
        project.owner_id = auth.uid()
        or public.current_app_role() = 'admin'::app_role
        or (
          public.current_app_role() = 'manager'::app_role
          and exists (
            select 1
            from public.project_members member
            where member.project_id = project.id
              and member.user_id = auth.uid()
          )
        )
      )
  );
$$;

create or replace function public.can_team_member_update_task(
  task_id uuid,
  new_project_id uuid,
  new_title text,
  new_description text,
  new_priority task_priority,
  new_due_date date,
  new_assigned_to uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.current_app_role() = 'team_member'::app_role
    and public.can_access_project(new_project_id)
    and exists (
      select 1
      from public.tasks original
      where original.id = task_id
        and original.project_id = new_project_id
        and original.title is not distinct from new_title
        and original.description is not distinct from new_description
        and original.priority is not distinct from new_priority
        and original.due_date is not distinct from new_due_date
        and original.assigned_to is not distinct from new_assigned_to
    );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    case
      when exists (select 1 from public.profiles) then 'team_member'::app_role
      else 'admin'::app_role
    end
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

with ordered_users as (
  select
    id,
    email,
    raw_user_meta_data,
    row_number() over (order by created_at, id) as row_num
  from auth.users
)
insert into public.profiles (id, full_name, role)
select
  ordered_users.id,
  coalesce(ordered_users.raw_user_meta_data->>'full_name', split_part(ordered_users.email, '@', 1)),
  case
    when ordered_users.row_num = 1 and not exists (select 1 from public.profiles)
      then 'admin'::app_role
    else 'team_member'::app_role
  end
from ordered_users
on conflict (id) do nothing;

-- ─────────────────────────────────────────────
-- ROW LEVEL SECURITY (RLS)
-- ─────────────────────────────────────────────

-- Projects: owners can CRUD their own projects
alter table public.projects enable row level security;

alter table public.profiles enable row level security;
alter table public.project_members enable row level security;

drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id and role = public.current_app_role());

drop policy if exists "Users can view their own projects" on public.projects;
create policy "Users can view their own projects"
  on public.projects for select
  using (public.can_access_project(id));

drop policy if exists "Users can create projects" on public.projects;
create policy "Users can create projects"
  on public.projects for insert
  with check (
    public.current_app_role() = 'admin'::app_role
    and auth.uid() = owner_id
  );

drop policy if exists "Users can update their own projects" on public.projects;
create policy "Users can update their own projects"
  on public.projects for update
  using (public.can_manage_project(id))
  with check (public.can_manage_project(id));

drop policy if exists "Users can delete their own projects" on public.projects;
create policy "Users can delete their own projects"
  on public.projects for delete
  using (public.can_manage_project(id));

drop policy if exists "Users can view project members for accessible projects" on public.project_members;
create policy "Users can view project members for accessible projects"
  on public.project_members for select
  using (public.can_access_project(project_id));

drop policy if exists "Admins can manage project members" on public.project_members;
create policy "Admins can manage project members"
  on public.project_members for all
  using (public.current_app_role() = 'admin'::app_role)
  with check (public.current_app_role() = 'admin'::app_role);

-- Tasks: accessible to project owner
alter table public.tasks enable row level security;

drop policy if exists "Users can view tasks in their projects" on public.tasks;
create policy "Users can view tasks in their projects"
  on public.tasks for select
  using (public.can_access_project(project_id));

drop policy if exists "Users can create tasks in their projects" on public.tasks;
create policy "Users can create tasks in their projects"
  on public.tasks for insert
  with check (public.can_access_project(project_id));

drop policy if exists "Admins and managers can update tasks" on public.tasks;
create policy "Admins and managers can update tasks"
  on public.tasks for update
  using (public.can_manage_project(project_id))
  with check (public.can_manage_project(project_id));

drop policy if exists "Team members can update task status only" on public.tasks;
create policy "Team members can update task status only"
  on public.tasks for update
  using (
    public.current_app_role() = 'team_member'::app_role
    and public.can_access_project(project_id)
  )
  with check (
    public.can_team_member_update_task(
      id,
      project_id,
      title,
      description,
      priority,
      due_date,
      assigned_to
    )
  );

drop policy if exists "Users can delete tasks in their projects" on public.tasks;
create policy "Users can delete tasks in their projects"
  on public.tasks for delete
  using (public.can_manage_project(project_id));

-- ─────────────────────────────────────────────
-- INDEXES for performance
-- ─────────────────────────────────────────────
create index if not exists tasks_project_id_idx on public.tasks(project_id);
create index if not exists tasks_status_idx on public.tasks(status);
create index if not exists projects_owner_id_idx on public.projects(owner_id);
create index if not exists project_members_project_id_idx on public.project_members(project_id);
create index if not exists project_members_user_id_idx on public.project_members(user_id);

-- ─────────────────────────────────────────────
-- STORAGE
-- ─────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update
set public = excluded.public;

drop policy if exists "Avatar images are publicly accessible" on storage.objects;
create policy "Avatar images are publicly accessible"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "Users can upload their own avatar" on storage.objects;
create policy "Users can upload their own avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can update their own avatar" on storage.objects;
create policy "Users can update their own avatar"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can delete their own avatar" on storage.objects;
create policy "Users can delete their own avatar"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
