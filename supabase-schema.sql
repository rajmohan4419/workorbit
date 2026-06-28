-- =============================================
-- OrbitBoard — Supabase SQL Schema
-- =============================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────────
-- 1. TYPES & ENUMS
-- ─────────────────────────────────────────────

do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type app_role as enum ('admin', 'member', 'viewer');
  end if;

  if not exists (select 1 from pg_type where typname = 'workspace_role') then
    create type workspace_role as enum ('owner', 'admin', 'member', 'viewer');
  end if;

  if not exists (select 1 from pg_type where typname = 'task_status') then
    create type task_status as enum ('todo', 'in_progress', 'in_review', 'done');
  end if;

  if not exists (select 1 from pg_type where typname = 'task_priority') then
    create type task_priority as enum ('low', 'medium', 'high');
  end if;
end
$$;

-- ─────────────────────────────────────────────
-- 2. TABLES
-- ─────────────────────────────────────────────

-- PROFILES
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  first_name  text,
  last_name   text,
  phone       text,
  avatar_path text,
  role        app_role not null default 'member',
  onboarding_completed boolean default false,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- WORKSPACES
create table if not exists public.workspaces (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  slug        text not null unique,
  owner_id    uuid references public.profiles(id) on delete cascade not null,
  workspace_plan text not null default 'free' check (workspace_plan in ('free', 'pro', 'business', 'enterprise')),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- WORKSPACE MEMBERS
create table if not exists public.workspace_members (
  id           uuid primary key default uuid_generate_v4(),
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  user_id      uuid references public.profiles(id) on delete cascade not null,
  role         workspace_role not null default 'member',
  created_at   timestamptz default now(),
  unique (workspace_id, user_id)
);

-- WORKSPACE INVITES
create table if not exists public.workspace_invites (
  id           uuid primary key default uuid_generate_v4(),
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  email        text not null,
  role         workspace_role not null default 'member',
  invited_by   uuid references public.profiles(id) on delete cascade not null default auth.uid(),
  status       text default 'pending',
  created_at   timestamptz default now(),
  unique (workspace_id, email)
);

-- PROJECTS
create table if not exists public.projects (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  description text,
  owner_id    uuid references public.profiles(id) on delete cascade not null default auth.uid(),
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- PROJECT MEMBERS
create table if not exists public.project_members (
  id           uuid primary key default uuid_generate_v4(),
  project_id   uuid references public.projects(id) on delete cascade not null,
  user_id      uuid references public.profiles(id) on delete cascade not null,
  created_at   timestamptz default now(),
  unique (project_id, user_id)
);

-- PROJECT INVITES
create table if not exists public.project_invites (
  id           uuid primary key default uuid_generate_v4(),
  project_id   uuid references public.projects(id) on delete cascade not null,
  email        text not null,
  role         workspace_role not null default 'member',
  invited_by   uuid references public.profiles(id) on delete cascade not null default auth.uid(),
  status       text default 'pending',
  created_at   timestamptz default now(),
  unique (project_id, email)
);

-- TASKS
create table if not exists public.tasks (
  id          uuid primary key default uuid_generate_v4(),
  project_id  uuid references public.projects(id) on delete cascade not null,
  title       text not null,
  description text,
  status      task_status default 'todo',
  priority    task_priority default 'medium',
  due_date    date,
  assigned_to uuid references public.profiles(id) on delete set null,
  created_by  uuid references public.profiles(id) on delete set null default auth.uid(),
  sprint_id   uuid,
  story_points integer,
  estimate_hours numeric,
  is_blocked  boolean default false,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- TASK COMMENTS
create table if not exists public.task_comments (
  id          uuid primary key default uuid_generate_v4(),
  task_id     uuid references public.tasks(id) on delete cascade not null,
  user_id     uuid references public.profiles(id) on delete cascade not null default auth.uid(),
  content     text not null,
  created_at  timestamptz default now()
);

-- TASK ATTACHMENTS
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

-- TASK LOGS (Activity)
create table if not exists public.task_logs (
  id          uuid primary key default uuid_generate_v4(),
  task_id     uuid references public.tasks(id) on delete cascade not null,
  user_id     uuid references public.profiles(id) on delete set null,
  type        text not null,
  old_value   text,
  new_value   text,
  created_at  timestamptz default now()
);

-- NOTIFICATIONS
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

-- SPRINTS
create table if not exists public.sprints (
  id          uuid primary key default uuid_generate_v4(),
  project_id  uuid references public.projects(id) on delete cascade not null,
  name        text not null,
  start_date  date not null,
  end_date    date not null,
  goal        text,
  status      text default 'planned' check (status in ('backlog', 'planned', 'active', 'completed')),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- Sprint Foreign Key on Tasks
alter table public.tasks drop constraint if exists tasks_sprint_id_fkey;
alter table public.tasks add constraint tasks_sprint_id_fkey foreign key (sprint_id) references public.sprints(id) on delete set null;

-- LABELS
create table if not exists public.labels (
  id          uuid primary key default uuid_generate_v4(),
  project_id  uuid references public.projects(id) on delete cascade not null,
  name        text not null,
  color       text not null default '#4f46e5',
  created_at  timestamptz default now(),
  unique (project_id, name)
);

create table if not exists public.task_labels (
  task_id  uuid references public.tasks(id) on delete cascade not null,
  label_id uuid references public.labels(id) on delete cascade not null,
  primary key (task_id, label_id)
);

-- SUBTASKS
create table if not exists public.task_subtasks (
  id           uuid primary key default uuid_generate_v4(),
  task_id      uuid references public.tasks(id) on delete cascade not null,
  title        text not null,
  is_completed boolean default false,
  created_at   timestamptz default now()
);

-- TIME LOGS
create table if not exists public.time_logs (
  id          uuid primary key default uuid_generate_v4(),
  task_id     uuid references public.tasks(id) on delete cascade not null,
  user_id     uuid references public.profiles(id) on delete cascade default auth.uid(),
  duration_seconds integer not null,
  description text,
  logged_at   date default current_date,
  created_at  timestamptz default now()
);

-- DEPENDENCIES
create table if not exists public.task_dependencies (
  id              uuid primary key default uuid_generate_v4(),
  task_id         uuid references public.tasks(id) on delete cascade not null,
  depends_on_id   uuid references public.tasks(id) on delete cascade not null,
  created_at      timestamptz default now(),
  unique (task_id, depends_on_id),
  check (task_id != depends_on_id)
);

-- ─────────────────────────────────────────────
-- 3. SCHEMA EVOLUTION & CONSTRAINTS
-- ─────────────────────────────────────────────

-- Profiles
alter table public.profiles add column if not exists first_name text;
alter table public.profiles add column if not exists last_name text;

-- Workspaces
alter table public.workspaces add column if not exists workspace_plan text not null default 'free' check (workspace_plan in ('free', 'pro', 'business', 'enterprise'));

-- Projects
alter table public.projects add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;

-- Tasks
alter table public.tasks add column if not exists story_points integer;
alter table public.tasks add column if not exists estimate_hours numeric;
alter table public.tasks add column if not exists is_blocked boolean default false;
alter table public.tasks add column if not exists sprint_id uuid;

-- Tasks Sprint FK (Evolution)
alter table public.tasks drop constraint if exists tasks_sprint_id_fkey;
alter table public.tasks add constraint tasks_sprint_id_fkey foreign key (sprint_id) references public.sprints(id) on delete set null;

-- Nudge roles for PostgREST cache
alter table public.workspace_members add column if not exists role workspace_role not null default 'member';
alter table public.workspace_invites add column if not exists role workspace_role not null default 'member';
alter table public.project_invites add column if not exists role workspace_role not null default 'member';

-- Ensure named foreign keys for relationship detection (PostgREST)
alter table public.workspace_members drop constraint if exists workspace_members_user_id_fkey;
alter table public.workspace_members add constraint workspace_members_user_id_fkey foreign key (user_id) references public.profiles(id) on delete cascade;

alter table public.project_members drop constraint if exists project_members_user_id_fkey;
alter table public.project_members add constraint project_members_user_id_fkey foreign key (user_id) references public.profiles(id) on delete cascade;

alter table public.tasks drop constraint if exists tasks_assigned_to_fkey;
alter table public.tasks add constraint tasks_assigned_to_fkey foreign key (assigned_to) references public.profiles(id) on delete set null;

alter table public.tasks drop constraint if exists tasks_created_by_fkey;
alter table public.tasks add constraint tasks_created_by_fkey foreign key (created_by) references public.profiles(id) on delete set null;

alter table public.task_comments drop constraint if exists task_comments_user_id_fkey;
alter table public.task_comments add constraint task_comments_user_id_fkey foreign key (user_id) references public.profiles(id) on delete cascade;

alter table public.task_attachments drop constraint if exists task_attachments_user_id_fkey;
alter table public.task_attachments add constraint task_attachments_user_id_fkey foreign key (user_id) references public.profiles(id) on delete cascade;

alter table public.task_logs drop constraint if exists task_logs_user_id_fkey;
alter table public.task_logs add constraint task_logs_user_id_fkey foreign key (user_id) references public.profiles(id) on delete set null;

alter table public.time_logs drop constraint if exists time_logs_user_id_fkey;
alter table public.time_logs add constraint time_logs_user_id_fkey foreign key (user_id) references public.profiles(id) on delete cascade;

alter table public.workspace_invites drop constraint if exists workspace_invites_invited_by_fkey;
alter table public.workspace_invites add constraint workspace_invites_invited_by_fkey foreign key (invited_by) references public.profiles(id) on delete cascade;

alter table public.project_invites drop constraint if exists project_invites_invited_by_fkey;
alter table public.project_invites add constraint project_invites_invited_by_fkey foreign key (invited_by) references public.profiles(id) on delete cascade;

alter table public.notifications drop constraint if exists notifications_user_id_fkey;
alter table public.notifications add constraint notifications_user_id_fkey foreign key (user_id) references public.profiles(id) on delete cascade;

alter table public.task_dependencies drop constraint if exists task_dependencies_depends_on_id_fkey;
alter table public.task_dependencies add constraint task_dependencies_depends_on_id_fkey foreign key (depends_on_id) references public.tasks(id) on delete cascade;

alter table public.task_labels drop constraint if exists task_labels_task_id_fkey;
alter table public.task_labels add constraint task_labels_task_id_fkey foreign key (task_id) references public.tasks(id) on delete cascade;

alter table public.task_labels drop constraint if exists task_labels_label_id_fkey;
alter table public.task_labels add constraint task_labels_label_id_fkey foreign key (label_id) references public.labels(id) on delete cascade;

alter table public.projects drop constraint if exists projects_workspace_id_fkey;
alter table public.projects add constraint projects_workspace_id_fkey foreign key (workspace_id) references public.workspaces(id) on delete cascade;

alter table public.tasks drop constraint if exists tasks_project_id_fkey;
alter table public.tasks add constraint tasks_project_id_fkey foreign key (project_id) references public.projects(id) on delete cascade;

alter table public.sprints drop constraint if exists sprints_project_id_fkey;
alter table public.sprints add constraint sprints_project_id_fkey foreign key (project_id) references public.projects(id) on delete cascade;

alter table public.labels drop constraint if exists labels_project_id_fkey;
alter table public.labels add constraint labels_project_id_fkey foreign key (project_id) references public.projects(id) on delete cascade;

-- ─────────────────────────────────────────────
-- 4. HELPER FUNCTIONS
-- ─────────────────────────────────────────────

create or replace function public.current_workspace_role(target_workspace_id uuid)
returns workspace_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.workspace_members
  where workspace_id = target_workspace_id and user_id = auth.uid()
  union all
  select 'owner'::workspace_role from public.workspaces
  where id = target_workspace_id and owner_id = auth.uid()
  limit 1;
$$;

create or replace function public.can_access_workspace(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.workspaces
    where id = target_workspace_id
    and (
      owner_id = auth.uid()
      or exists (
        select 1 from public.workspace_members
        where workspace_id = target_workspace_id and user_id = auth.uid()
      )
    )
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
      and public.can_access_workspace(project.workspace_id)
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
      and public.current_workspace_role(project.workspace_id) in ('owner', 'admin')
  );
$$;

-- ─────────────────────────────────────────────
-- 5. RLS POLICIES
-- ─────────────────────────────────────────────

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.workspace_invites enable row level security;
alter table public.project_members enable row level security;
alter table public.project_invites enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.task_comments enable row level security;
alter table public.task_attachments enable row level security;
alter table public.task_subtasks enable row level security;
alter table public.task_dependencies enable row level security;
alter table public.task_logs enable row level security;
alter table public.time_logs enable row level security;
alter table public.sprints enable row level security;
alter table public.labels enable row level security;
alter table public.task_labels enable row level security;
alter table public.notifications enable row level security;

-- Profiles
create policy "Public profile view" on public.profiles for select using (true);
create policy "Self profile update" on public.profiles for update using (auth.uid() = id);

-- Workspaces
create policy "Workspace view access" on public.workspaces for select using (public.can_access_workspace(id));
create policy "Workspace creation" on public.workspaces for insert with check (auth.uid() = owner_id);
create policy "Workspace update" on public.workspaces for update using (public.current_workspace_role(id) in ('owner', 'admin'));
create policy "Workspace deletion" on public.workspaces for delete using (auth.uid() = owner_id);

-- Workspace Members & Invites
create policy "Member view" on public.workspace_members for select using (public.can_access_workspace(workspace_id));
create policy "Member management" on public.workspace_members for all using (public.current_workspace_role(workspace_id) in ('owner', 'admin'));
create policy "Invite view" on public.workspace_invites for select using (email = (auth.jwt() ->> 'email') or public.current_workspace_role(workspace_id) in ('owner', 'admin'));
create policy "Invite management" on public.workspace_invites for all using (public.current_workspace_role(workspace_id) in ('owner', 'admin'));

-- Project Members & Invites
create policy "Proj member view" on public.project_members for select using (public.can_access_project(project_id));
create policy "Proj member management" on public.project_members for all using (public.can_manage_project(project_id));
create policy "Proj invite view" on public.project_invites for select using (email = (auth.jwt() ->> 'email') or public.can_manage_project(project_id));
create policy "Proj invite management" on public.project_invites for all using (public.can_manage_project(project_id));

-- Projects
create policy "Project view" on public.projects for select using (public.can_access_workspace(workspace_id));
create policy "Project creation" on public.projects for insert with check (public.current_workspace_role(workspace_id) in ('owner', 'admin'));
create policy "Project update" on public.projects for update using (public.current_workspace_role(workspace_id) in ('owner', 'admin'));
create policy "Project deletion" on public.projects for delete using (public.current_workspace_role(workspace_id) in ('owner', 'admin'));

-- Tasks
create policy "Task view" on public.tasks for select using (public.can_access_project(project_id));
create policy "Task creation" on public.tasks for insert with check (public.can_access_project(project_id) and public.current_workspace_role((select workspace_id from public.projects where id = project_id)) in ('owner', 'admin', 'member'));
create policy "Task update" on public.tasks for update using (public.can_access_project(project_id) and public.current_workspace_role((select workspace_id from public.projects where id = project_id)) in ('owner', 'admin', 'member'));
create policy "Task deletion" on public.tasks for delete using (public.can_manage_project(project_id));

-- Sub-entities
create policy "Task sub-entity" on public.task_comments for all using (public.can_access_project((select project_id from public.tasks where id = task_id)));
create policy "Task sub-entity att" on public.task_attachments for all using (public.can_access_project((select project_id from public.tasks where id = task_id)));
create policy "Task sub-entity sub" on public.task_subtasks for all using (public.can_access_project((select project_id from public.tasks where id = task_id)));
create policy "Task sub-entity dep" on public.task_dependencies for all using (public.can_access_project((select project_id from public.tasks where id = task_id)));
create policy "Task sub-entity log" on public.task_logs for all using (public.can_access_project((select project_id from public.tasks where id = task_id)));
create policy "Task sub-entity time" on public.time_logs for all using (public.can_access_project((select project_id from public.tasks where id = task_id)));
create policy "Task sub-entity lab" on public.task_labels for all using (public.can_access_project((select project_id from public.tasks where id = task_id)));

create policy "Proj sub-entity spr" on public.sprints for all using (public.can_access_project(project_id));
create policy "Proj sub-entity lab" on public.labels for all using (public.can_access_project(project_id));

-- Notifications
create policy "Self notify" on public.notifications for all using (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- 6. AUTOMATION & TRIGGERS
-- ─────────────────────────────────────────────

create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger projects_updated_at before update on public.projects for each row execute procedure public.handle_updated_at();
create trigger profiles_updated_at before update on public.profiles for each row execute procedure public.handle_updated_at();
create trigger tasks_updated_at before update on public.tasks for each row execute procedure public.handle_updated_at();
create trigger sprints_updated_at before update on public.sprints for each row execute procedure public.handle_updated_at();

-- Workspace Owner constraint
create or replace function public.check_workspace_owner_role()
returns trigger as $$
begin
  if (new.role = 'owner') then
    if exists (
      select 1 from public.workspace_members
      where workspace_id = new.workspace_id and role = 'owner' and id != new.id
    ) or exists (
      select 1 from public.workspaces
      where id = new.workspace_id and owner_id != new.user_id
    ) then
      raise exception 'A workspace can only have one owner.';
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger tr_check_workspace_owner_role before insert or update on public.workspace_members for each row execute procedure public.check_workspace_owner_role();

-- ACTIVITY LOGGING TRIGGERS
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

create trigger tasks_status_log after update on public.tasks for each row execute procedure public.log_task_status_change();

create or replace function public.log_new_comment()
returns trigger as $$
begin
  insert into public.task_logs (task_id, user_id, type, new_value)
  values (new.task_id, new.user_id, 'comment_added', left(new.content, 50));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_comment_logged after insert on public.task_comments for each row execute procedure public.log_new_comment();

-- NOTIFICATION TRIGGERS
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

create trigger on_task_assigned after update on public.tasks for each row execute procedure public.notify_task_assignment();

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
  from public.tasks where id = new.task_id;

  insert into public.notifications (user_id, type, title, content, link)
  select p.id, 'task_mention', 'You were mentioned in a comment', 'In: ' || task_title, '/project/' || task_project_id
  from public.profiles p
  where new.content ~ ('@' || p.full_name) and p.id != new.user_id;

  if (task_assignee is not null and task_assignee != new.user_id) then
    insert into public.notifications (user_id, type, title, content, link)
    values (task_assignee, 'new_comment', 'New comment on task', 'Someone commented on: ' || task_title, '/project/' || task_project_id);
  end if;

  return new;
end;
$$ language plpgsql security definer;

create trigger on_comment_added after insert on public.task_comments for each row execute procedure public.notify_new_comment();

-- NEW USER SIGNUP TRIGGER
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_invited boolean;
  new_ws_id uuid;
begin
  select exists (select 1 from public.workspace_invites where email = new.email) into is_invited;

  insert into public.profiles (id, full_name, first_name, last_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name',
    case when exists (select 1 from public.profiles) then 'member'::app_role else 'admin'::app_role end
  ) on conflict (id) do update set
    full_name = excluded.full_name,
    first_name = coalesce(profiles.first_name, excluded.first_name),
    last_name = coalesce(profiles.last_name, excluded.last_name);

  if not is_invited then
    insert into public.workspaces (name, slug, owner_id)
    values (
      split_part(new.email, '@', 1) || '''s Workspace',
      split_part(new.email, '@', 1) || '-' || left(uuid_generate_v4()::text, 4),
      new.id
    ) returning id into new_ws_id;

    insert into public.workspace_members (workspace_id, user_id, role)
    values (new_ws_id, new.id, 'owner');
  else
    insert into public.workspace_members (workspace_id, user_id, role)
    select workspace_id, new.id, role
    from public.workspace_invites where email = new.email
    on conflict (workspace_id, user_id) do update set role = excluded.role;

    delete from public.workspace_invites where email = new.email;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

-- ─────────────────────────────────────────────
-- 7. MIGRATIONS & FIXES
-- ─────────────────────────────────────────────

-- Ensure all users have a workspace and are in workspace_members
do $$
declare
  prof record;
  ws_id uuid;
begin
  for prof in select * from public.profiles loop
    if not exists (select 1 from public.workspace_members where user_id = prof.id) then
      if not exists (select 1 from public.workspaces where owner_id = prof.id) then
        insert into public.workspaces (name, slug, owner_id)
        values (prof.full_name || '''s Workspace', lower(replace(prof.full_name, ' ', '-')) || '-' || left(prof.id::text, 4), prof.id)
        on conflict (slug) do update set updated_at = now()
        returning id into ws_id;
      else
        select id into ws_id from public.workspaces where owner_id = prof.id limit 1;
      end if;

      insert into public.workspace_members (workspace_id, user_id, role)
      values (ws_id, prof.id, 'owner')
      on conflict (workspace_id, user_id) do nothing;
    end if;
  end loop;
end
$$;

-- Ensure all project owners are in project_members
do $$
declare
  proj record;
begin
  for proj in select * from public.projects loop
    if not exists (select 1 from public.project_members where project_id = proj.id and user_id = proj.owner_id) then
      insert into public.project_members (project_id, user_id)
      values (proj.id, proj.owner_id);
    end if;
  end loop;
end
$$;

-- Migrate projects without workspace_id
do $$
begin
  -- Fallback 1: Use workspace_members
  update public.projects p
  set workspace_id = (
    select wm.workspace_id
    from public.workspace_members wm
    where wm.user_id = p.owner_id and wm.role = 'owner'
    limit 1
  )
  where p.workspace_id is null;

  -- Fallback 2: Use workspaces table directly
  update public.projects p
  set workspace_id = (
    select w.id
    from public.workspaces w
    where w.owner_id = p.owner_id
    limit 1
  )
  where p.workspace_id is null;

  -- Now enforce NOT NULL using dynamic SQL to avoid compilation issues
  execute 'alter table public.projects alter column workspace_id set not null';
end
$$;

-- ─────────────────────────────────────────────
-- 8. PERMISSIONS & CACHE RELOAD
-- ─────────────────────────────────────────────

-- STORAGE
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('task-attachments', 'task-attachments', true) on conflict (id) do nothing;

drop policy if exists "Avatar access" on storage.objects;
create policy "Avatar access" on storage.objects for select using (bucket_id = 'avatars');
create policy "Avatar upload" on storage.objects for insert with check (bucket_id = 'avatars' and auth.role() = 'authenticated' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Attachment access" on storage.objects;
create policy "Attachment access" on storage.objects for select using (bucket_id = 'task-attachments');
drop policy if exists "Attachment upload" on storage.objects;
create policy "Attachment upload" on storage.objects for insert with check (bucket_id = 'task-attachments' and auth.role() = 'authenticated');

-- GRANTS
grant usage on schema public to anon, authenticated;
grant all on all tables in schema public to anon, authenticated;
grant all on public.workspace_members to anon, authenticated;
grant all on public.workspace_invites to anon, authenticated;
grant all on public.project_members to anon, authenticated;
grant all on public.project_invites to anon, authenticated;
grant all on all sequences in schema public to anon, authenticated;
grant all on all functions in schema public to anon, authenticated;

-- RELOAD CACHE
notify pgrst, 'reload schema';
