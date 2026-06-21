-- =============================================
-- ProjectFlow — Supabase SQL Schema
-- Run this in your Supabase SQL Editor
-- =============================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type app_role as enum ('admin', 'member', 'viewer');
  else
    alter type app_role add value if not exists 'member';
    alter type app_role add value if not exists 'viewer';
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
  role        app_role not null default 'member',
  onboarding_completed boolean default false,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- Ensure the column exists for existing databases
alter table public.profiles add column if not exists onboarding_completed boolean default false;

-- ─────────────────────────────────────────────
-- PROJECTS
-- ─────────────────────────────────────────────
create table if not exists public.projects (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  description text,
  owner_id    uuid references public.profiles(id) on delete cascade not null default auth.uid(),
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
  assigned_to uuid references public.profiles(id) on delete set null,
  created_by  uuid references public.profiles(id) default auth.uid(),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create table if not exists public.project_members (
  id          uuid primary key default uuid_generate_v4(),
  project_id  uuid references public.projects(id) on delete cascade not null,
  user_id     uuid references public.profiles(id) on delete cascade not null,
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
    'member'::app_role
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
      )
  );
$$;

create or replace function public.can_member_update_task(
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
    public.current_app_role() = 'member'::app_role
    and public.can_access_project(new_project_id)
    and exists (
      select 1
      from public.tasks original
      where original.id = task_id
        and original.project_id = new_project_id
        and (
          original.created_by = auth.uid()
          or original.assigned_to = auth.uid()
          or (
            original.title is not distinct from new_title
            and original.description is not distinct from new_description
            and original.priority is not distinct from new_priority
            and original.due_date is not distinct from new_due_date
            and original.assigned_to is not distinct from new_assigned_to
          )
        )
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
      when exists (select 1 from public.profiles) then 'member'::app_role
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
    else 'member'::app_role
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

drop policy if exists "Users can view profiles" on public.profiles;
create policy "Users can view profiles"
  on public.profiles for select
  using (
    auth.uid() = id
    or public.current_app_role() = 'admin'::app_role
    or exists (
      select 1 from public.project_members pm
      where pm.user_id = profiles.id
      and public.can_access_project(pm.project_id)
    )
  );

drop policy if exists "Users can update profiles" on public.profiles;
create policy "Users can update profiles"
  on public.profiles for update
  using (auth.uid() = id or public.current_app_role() = 'admin'::app_role)
  with check (
    (auth.uid() = id and role = public.current_app_role()) -- Users can't change their own role
    or public.current_app_role() = 'admin'::app_role
  );

drop policy if exists "Users can view their own projects" on public.projects;
create policy "Users can view their own projects"
  on public.projects for select
  using (public.can_access_project(id));

drop policy if exists "Users can create projects" on public.projects;
create policy "Users can create projects"
  on public.projects for insert
  with check (
    public.current_app_role() in ('admin'::app_role, 'member'::app_role)
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

drop policy if exists "Admins, managers and owners can update tasks" on public.tasks;
drop policy if exists "Admins and owners can update tasks" on public.tasks;
create policy "Admins and owners can update tasks"
  on public.tasks for update
  using (public.can_manage_project(project_id));

drop policy if exists "Admins and managers can update tasks" on public.tasks;
drop policy if exists "Team members can update task status only" on public.tasks;
drop policy if exists "Members can update task status only" on public.tasks;
drop policy if exists "Members can update tasks" on public.tasks;
create policy "Members can update tasks"
  on public.tasks for update
  using (
    public.current_app_role() = 'member'::app_role
    and public.can_access_project(project_id)
  )
  with check (
    public.can_member_update_task(
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
-- TASK COMMENTS
-- ─────────────────────────────────────────────
create table if not exists public.task_comments (
  id          uuid primary key default uuid_generate_v4(),
  task_id     uuid references public.tasks(id) on delete cascade not null,
  user_id     uuid references public.profiles(id) on delete cascade not null default auth.uid(),
  content     text not null,
  created_at  timestamptz default now()
);

alter table public.task_comments enable row level security;

create policy "Users can view comments for tasks they can access"
  on public.task_comments for select
  using (exists (
    select 1 from public.tasks
    where tasks.id = task_comments.task_id
      and public.can_access_project(tasks.project_id)
  ));

create policy "Users can insert comments for tasks they can access"
  on public.task_comments for insert
  with check (exists (
    select 1 from public.tasks
    where tasks.id = task_comments.task_id
      and public.can_access_project(tasks.project_id)
  ) and auth.uid() = user_id);

create policy "Users can delete their own comments"
  on public.task_comments for delete
  using (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- TASK LOGS (Activity)
-- ─────────────────────────────────────────────
create table if not exists public.task_logs (
  id          uuid primary key default uuid_generate_v4(),
  task_id     uuid references public.tasks(id) on delete cascade not null,
  user_id     uuid references public.profiles(id) on delete set null,
  type        text not null,
  old_value   text,
  new_value   text,
  created_at  timestamptz default now()
);

alter table public.task_logs enable row level security;

create policy "Users can view logs for tasks they can access"
  on public.task_logs for select
  using (exists (
    select 1 from public.tasks
    where tasks.id = task_logs.task_id
      and public.can_access_project(tasks.project_id)
  ));

-- Trigger to log status changes
create or replace function public.log_task_status_change()
returns trigger as $$
begin
  if (old.status is distinct from new.status) then
    insert into public.task_logs (task_id, user_id, type, old_value, new_value)
    values (new.id, auth.uid(), 'status_change', old.status::text, new.status::text);
  end if;
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to log new comments
create or replace function public.log_new_comment()
returns trigger as $$
begin
  insert into public.task_logs (task_id, user_id, type, new_value)
  values (new.task_id, new.user_id, 'comment_added', left(new.content, 50));
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_comment_logged on public.task_comments;
create trigger on_comment_logged
  after insert on public.task_comments
  for each row execute procedure public.log_new_comment();

drop trigger if exists tasks_status_log on public.tasks;
create trigger tasks_status_log
  after update on public.tasks
  for each row execute procedure public.log_task_status_change();

-- ─────────────────────────────────────────────
-- PROJECT INVITES
-- ─────────────────────────────────────────────
create table if not exists public.project_invites (
  id          uuid primary key default uuid_generate_v4(),
  project_id  uuid references public.projects(id) on delete cascade not null,
  email       text not null,
  role        app_role not null default 'member',
  invited_by  uuid references public.profiles(id) on delete cascade not null default auth.uid(),
  status      text default 'pending',
  created_at  timestamptz default now(),
  unique (project_id, email)
);

create or replace function public.check_self_invite()
returns trigger as $$
begin
  if exists (
    select 1 from auth.users
    where id = new.invited_by and email = new.email
  ) then
    raise exception 'You cannot invite yourself.';
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists tr_check_self_invite on public.project_invites;
create trigger tr_check_self_invite
  before insert on public.project_invites
  for each row execute procedure public.check_self_invite();

alter table public.project_invites enable row level security;

create policy "Users can view invites for projects they manage"
  on public.project_invites for select
  using (public.can_manage_project(project_id) or email = (select email from auth.users where id = auth.uid()));

create policy "Admins and owners can create invites"
  on public.project_invites for insert
  with check (public.can_manage_project(project_id));

create policy "Admins and owners can delete invites"
  on public.project_invites for delete
  using (public.can_manage_project(project_id));

-- ─────────────────────────────────────────────
-- SUBTASKS
-- ─────────────────────────────────────────────
create table if not exists public.task_subtasks (
  id           uuid primary key default uuid_generate_v4(),
  task_id      uuid references public.tasks(id) on delete cascade not null,
  title        text not null,
  is_completed boolean default false,
  created_at   timestamptz default now()
);

alter table public.task_subtasks enable row level security;

create policy "Users can view subtasks for tasks they can access"
  on public.task_subtasks for select
  using (exists (
    select 1 from public.tasks
    where tasks.id = task_subtasks.task_id
      and public.can_access_project(tasks.project_id)
  ));

create policy "Users can manage subtasks for tasks they can access"
  on public.task_subtasks for all
  using (exists (
    select 1 from public.tasks
    where tasks.id = task_subtasks.task_id
      and public.can_access_project(tasks.project_id)
  ));

-- ─────────────────────────────────────────────
-- LABELS
-- ─────────────────────────────────────────────
create table if not exists public.labels (
  id          uuid primary key default uuid_generate_v4(),
  project_id  uuid references public.projects(id) on delete cascade not null,
  name        text not null,
  color       text not null default '#4f46e5',
  created_at  timestamptz default now(),
  unique (project_id, name)
);

alter table public.labels enable row level security;

create policy "Users can view labels for projects they can access"
  on public.labels for select
  using (public.can_access_project(project_id));

create policy "Admins and owners can manage labels"
  on public.labels for all
  using (public.can_manage_project(project_id));

create table if not exists public.task_labels (
  task_id  uuid references public.tasks(id) on delete cascade not null,
  label_id uuid references public.labels(id) on delete cascade not null,
  primary key (task_id, label_id)
);

alter table public.task_labels enable row level security;

create policy "Users can view task labels"
  on public.task_labels for select
  using (exists (
    select 1 from public.tasks
    where tasks.id = task_labels.task_id
      and public.can_access_project(tasks.project_id)
  ));

create policy "Users can manage task labels"
  on public.task_labels for all
  using (exists (
    select 1 from public.tasks
    where tasks.id = task_labels.task_id
      and public.can_access_project(tasks.project_id)
  ))
  with check (exists (
    select 1 from public.tasks
    where tasks.id = task_labels.task_id
      and public.can_access_project(tasks.project_id)
  ));

-- ─────────────────────────────────────────────
-- SPRINTS
-- ─────────────────────────────────────────────
create table if not exists public.sprints (
  id          uuid primary key default uuid_generate_v4(),
  project_id  uuid references public.projects(id) on delete cascade not null,
  name        text not null,
  start_date  date not null,
  end_date    date not null,
  goal        text,
  status      text default 'planned', -- planned, active, completed
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

drop trigger if exists sprints_updated_at on public.sprints;
create trigger sprints_updated_at
  before update on public.sprints
  for each row execute procedure public.handle_updated_at();

alter table public.sprints enable row level security;

create policy "Users can view sprints for accessible projects"
  on public.sprints for select
  using (public.can_access_project(project_id));

create policy "Admins and owners can manage sprints"
  on public.sprints for all
  using (public.can_manage_project(project_id));

-- Add sprint_id to tasks
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name='tasks' and column_name='sprint_id') then
    alter table public.tasks add column sprint_id uuid references public.sprints(id) on delete set null;
  end if;
end
$$;

-- ─────────────────────────────────────────────
-- ATTACHMENTS
-- ─────────────────────────────────────────────
create table if not exists public.task_attachments (
  id          uuid primary key default uuid_generate_v4(),
  task_id     uuid references public.tasks(id) on delete cascade not null,
  user_id     uuid references public.profiles(id) on delete cascade not null default auth.uid(),
  name        text not null,
  file_path   text not null,
  file_size   bigint,
  content_type text,
  created_at  timestamptz default now()
);

alter table public.task_attachments enable row level security;

create policy "Users can view attachments for accessible tasks"
  on public.task_attachments for select
  using (exists (
    select 1 from public.tasks
    where tasks.id = task_attachments.task_id
      and public.can_access_project(tasks.project_id)
  ));

create policy "Users can insert attachments"
  on public.task_attachments for insert
  with check (exists (
    select 1 from public.tasks
    where tasks.id = task_attachments.task_id
      and public.can_access_project(tasks.project_id)
  ));

create policy "Users can delete their own attachments"
  on public.task_attachments for delete
  using (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- TIME LOGS
-- ─────────────────────────────────────────────
create table if not exists public.time_logs (
  id          uuid primary key default uuid_generate_v4(),
  task_id     uuid references public.tasks(id) on delete cascade not null,
  user_id     uuid references public.profiles(id) on delete cascade not null default auth.uid(),
  duration_seconds integer not null,
  description text,
  logged_at   date default current_date,
  created_at  timestamptz default now()
);

alter table public.time_logs enable row level security;

create policy "Users can view time logs for accessible tasks"
  on public.time_logs for select
  using (exists (
    select 1 from public.tasks
    where tasks.id = time_logs.task_id
      and public.can_access_project(tasks.project_id)
  ));

create policy "Users can log time"
  on public.time_logs for insert
  with check (exists (
    select 1 from public.tasks
    where tasks.id = time_logs.task_id
      and public.can_access_project(tasks.project_id)
  ));

create policy "Users can delete their own time logs"
  on public.time_logs for delete
  using (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- NOTIFICATIONS
-- ─────────────────────────────────────────────
create table if not exists public.notifications (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references public.profiles(id) on delete cascade not null,
  type        text not null,
  title       text not null,
  content     text,
  link        text,
  read        boolean default false,
  metadata    jsonb,
  created_at  timestamptz default now()
);

alter table public.notifications enable row level security;

create policy "Users can view their own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

create policy "Users can update their own notifications"
  on public.notifications for update
  using (auth.uid() = user_id);

-- Trigger for task assignment notification
create or replace function public.notify_task_assignment()
returns trigger as $$
begin
  if (new.assigned_to is not null and (old.assigned_to is null or old.assigned_to != new.assigned_to)) then
    insert into public.notifications (user_id, type, title, content, link)
    values (
      new.assigned_to,
      'task_assignment',
      'New task assigned',
      'You have been assigned to: ' || new.title,
      '/project/' || new.project_id
    );
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_task_assigned on public.tasks;
create trigger on_task_assigned
  after update on public.tasks
  for each row execute procedure public.notify_task_assignment();

-- Trigger for new comment notification
create or replace function public.notify_new_comment()
returns trigger as $$
declare
  task_title text;
  task_project_id uuid;
  task_assignee uuid;
  task_owner uuid;
begin
  select title, project_id, assigned_to, created_by
  into task_title, task_project_id, task_assignee, task_owner
  from public.tasks
  where id = new.task_id;

  -- Notify mentioned users
  insert into public.notifications (user_id, type, title, content, link)
  select p.id, 'task_mention', 'You were mentioned in a comment', 'In: ' || task_title, '/project/' || task_project_id
  from public.profiles p
  where new.content ~ ('@' || p.full_name)
    and p.id != new.user_id;

  -- Notify assignee if not the commenter
  if (task_assignee is not null and task_assignee != new.user_id) then
    insert into public.notifications (user_id, type, title, content, link)
    values (
      task_assignee,
      'new_comment',
      'New comment on task',
      'Someone commented on: ' || task_title,
      '/project/' || task_project_id
    );
  end if;

  -- Notify owner if not the commenter and not the assignee
  if (task_owner is not null and task_owner != new.user_id and task_owner != coalesce(task_assignee, '00000000-0000-0000-0000-000000000000'::uuid)) then
    insert into public.notifications (user_id, type, title, content, link)
    values (
      task_owner,
      'new_comment',
      'New comment on task',
      'Someone commented on: ' || task_title,
      '/project/' || task_project_id
    );
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_comment_added on public.task_comments;
create trigger on_comment_added
  after insert on public.task_comments
  for each row execute procedure public.notify_new_comment();

create or replace function public.handle_project_member_added()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  invited_role app_role;
begin
  -- Find the invite for this user and project
  select role into invited_role
  from public.project_invites
  where project_id = new.project_id
    and email = (select email from auth.users where id = new.user_id)
  limit 1;

  -- If an invite exists, update the user's role
  if (invited_role is not null) then
    update public.profiles
    set role = invited_role
    where id = new.user_id;
  end if;

  return new;
end;
$$;

drop trigger if exists on_project_member_added on public.project_members;
create trigger on_project_member_added
  after insert on public.project_members
  for each row execute procedure public.handle_project_member_added();

-- Trigger for project invite notification
create or replace function public.notify_project_invite()
returns trigger as $$
declare
  target_user_id uuid;
  project_name text;
begin
  select id into target_user_id
  from auth.users
  where email = new.email;

  select name into project_name
  from public.projects
  where id = new.project_id;

  if (target_user_id is not null) then
    insert into public.notifications (user_id, type, title, content, link, metadata)
    values (
      target_user_id,
      'project_invite',
      'New project invite',
      'You have been invited to join: ' || project_name,
      null,
      jsonb_build_object('inviteId', new.id, 'projectId', new.project_id)
    );
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_project_invited on public.project_invites;
create trigger on_project_invited
  after insert on public.project_invites
  for each row execute procedure public.notify_project_invite();

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
