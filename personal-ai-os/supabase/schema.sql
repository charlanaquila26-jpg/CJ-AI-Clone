-- Apply to a NEW personal Supabase project only. Never apply to existing business projects.
create extension if not exists pgcrypto;
create table if not exists public.workspaces (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
 name text not null, created_at timestamptz not null default now(), unique(owner_id,name)
);
create table if not exists public.conversations (
 id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users(id) on delete cascade,
 workspace_id uuid references public.workspaces(id) on delete set null,title text not null default 'New conversation', created_at timestamptz not null default now()
);
create table if not exists public.messages (
 id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users(id) on delete cascade,
 conversation_id uuid not null references public.conversations(id) on delete cascade,role text not null check(role in ('user','assistant')),
 content text not null, created_at timestamptz not null default now()
);
create table if not exists public.tasks (
 id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users(id) on delete cascade,
 workspace_id uuid references public.workspaces(id) on delete set null,title text not null,details text not null default '',
 status text not null default 'pending' check(status in ('pending','in_progress','waiting_approval','completed','failed')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.memories (
 id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users(id) on delete cascade,
 workspace_id uuid references public.workspaces(id) on delete cascade, content text not null,created_at timestamptz not null default now()
);
create table if not exists public.approvals (
 id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users(id) on delete cascade,
 workspace_id uuid references public.workspaces(id) on delete set null,title text not null,description text not null default '',
 action_type text not null default 'manual_review', payload jsonb not null default '{}'::jsonb,
 status text not null default 'pending' check(status in ('pending','approved','rejected')),
 reviewed_at timestamptz,created_at timestamptz not null default now()
);
create table if not exists public.activity_logs (
 id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users(id) on delete cascade,
 workspace_id uuid references public.workspaces(id) on delete set null,event text not null,details text not null default '',
 created_at timestamptz not null default now()
);
create table if not exists public.usage_events (
 id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users(id) on delete cascade,
 model text not null,input_tokens integer not null default 0,output_tokens integer not null default 0,
 estimated_cost_usd numeric(12,6) not null default 0,created_at timestamptz not null default now()
);
create table if not exists public.scheduled_jobs (
 id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users(id) on delete cascade,
 workspace_id uuid references public.workspaces(id) on delete set null,name text not null,enabled boolean not null default true,
 kind text not null check(kind in ('create_task')),
 task_title text not null,interval_hours int not null default 24 check(interval_hours between 1 and 720),
 next_run_at timestamptz not null default now(),created_at timestamptz not null default now()
);
-- Owner isolation on every user-owned table.
do $$ declare t text; begin foreach t in array array['workspaces','conversations','messages','tasks','memories','approvals','activity_logs','usage_events','scheduled_jobs'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('create policy "own_select" on public.%I for select to authenticated using (owner_id = (select auth.uid()))',t);
 execute format('create policy "own_insert" on public.%I for insert to authenticated with check (owner_id = (select auth.uid()))',t);
 execute format('create policy "own_update" on public.%I for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()))',t);
 execute format('create policy "own_delete" on public.%I for delete to authenticated using (owner_id = (select auth.uid()))',t);
 end loop; end $$;
-- Ensure cross-record references never point to someone else's records.
create or replace function public.validate_ai_os_links() returns trigger language plpgsql as $$
begin
 if tg_table_name='messages' and not exists(select 1 from public.conversations c where c.id=new.conversation_id and c.owner_id=new.owner_id) then raise exception 'Invalid conversation'; end if;
 if tg_table_name in ('tasks','memories','approvals','activity_logs','scheduled_jobs','conversations') and new.workspace_id is not null and not exists(select 1 from public.workspaces w where w.id=new.workspace_id and w.owner_id=new.owner_id) then raise exception 'Invalid workspace'; end if;
 return new;
end $$;
do $$ declare t text; begin foreach t in array array['messages','tasks','memories','approvals','activity_logs','scheduled_jobs','conversations'] loop
 execute format('create trigger validate_links before insert or update on public.%I for each row execute function public.validate_ai_os_links()',t);
 end loop; end $$;
create index if not exists usage_owner_date on public.usage_events(owner_id,created_at);
create index if not exists jobs_next on public.scheduled_jobs(next_run_at) where enabled=true;
