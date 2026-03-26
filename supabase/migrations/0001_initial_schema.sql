-- Refund Raider initial schema
-- Storage bucket creation and storage policies are intentionally deferred
-- until the upload flow is implemented.

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'payment_method') then
    create type payment_method as enum (
      'credit_card',
      'debit_card',
      'paypal',
      'apple_pay',
      'shop_pay',
      'other',
      'unknown'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'case_status') then
    create type case_status as enum (
      'intake',
      'researching',
      'verdict_ready',
      'draft_ready',
      'sent',
      'waiting',
      'follow_up_needed',
      'closed'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'issue_type') then
    create type issue_type as enum (
      'damaged_item',
      'missing_item',
      'wrong_item',
      'late_delivery',
      'service_not_rendered',
      'subscription_cancellation',
      'other'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'desired_outcome') then
    create type desired_outcome as enum (
      'full_refund',
      'partial_refund',
      'replacement',
      'refund_or_replacement'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'artifact_kind') then
    create type artifact_kind as enum (
      'receipt',
      'order_email',
      'screenshot',
      'product_photo',
      'support_thread',
      'other'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'research_run_status') then
    create type research_run_status as enum ('queued', 'running', 'completed', 'failed');
  end if;

  if not exists (select 1 from pg_type where typname = 'policy_source_type') then
    create type policy_source_type as enum (
      'refund_policy',
      'warranty_policy',
      'support_page',
      'complaint_context',
      'faq',
      'other'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'strategy_eligibility') then
    create type strategy_eligibility as enum (
      'eligible',
      'likely_eligible',
      'unclear',
      'likely_ineligible'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'recommended_path') then
    create type recommended_path as enum (
      'support_email_first',
      'support_form_first',
      'replacement_first',
      'card_dispute',
      'manual_review'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'draft_status') then
    create type draft_status as enum ('draft', 'approved', 'sent', 'failed');
  end if;

  if not exists (select 1 from pg_type where typname = 'draft_tone') then
    create type draft_tone as enum ('firm_polite', 'neutral', 'escalation_ready');
  end if;

  if not exists (select 1 from pg_type where typname = 'action_type') then
    create type action_type as enum (
      'research_started',
      'research_completed',
      'strategy_created',
      'draft_created',
      'draft_approved',
      'email_sent',
      'email_failed',
      'follow_up_recommended'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'action_status') then
    create type action_status as enum ('pending', 'completed', 'failed');
  end if;

  if not exists (select 1 from pg_type where typname = 'message_role') then
    create type message_role as enum ('user', 'assistant', 'tool');
  end if;
end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  merchant_name text not null,
  merchant_url text,
  issue_summary text not null,
  issue_type issue_type not null,
  desired_outcome desired_outcome not null,
  purchase_date date,
  payment_method payment_method not null default 'unknown',
  status case_status not null default 'intake',
  currency text not null default 'USD',
  order_total_amount numeric(10,2),
  merchant_contact_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.artifacts (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases (id) on delete cascade,
  kind artifact_kind not null,
  file_name text,
  mime_type text,
  storage_path text,
  source_text text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.research_runs (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases (id) on delete cascade,
  status research_run_status not null default 'queued',
  query_bundle jsonb not null default '{}'::jsonb,
  result_summary jsonb not null default '{}'::jsonb,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.policy_sources (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases (id) on delete cascade,
  research_run_id uuid not null references public.research_runs (id) on delete cascade,
  source_type policy_source_type not null,
  url text not null,
  title text,
  quote_text text,
  normalized_facts jsonb not null default '{}'::jsonb,
  confidence_score numeric(4,3),
  created_at timestamptz not null default now()
);

create table if not exists public.refund_strategies (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases (id) on delete cascade,
  eligibility strategy_eligibility not null,
  recommended_path recommended_path not null,
  fallback_path recommended_path,
  deadline_at timestamptz,
  plain_english_summary text not null,
  reasoning_notes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.drafts (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases (id) on delete cascade,
  strategy_id uuid not null references public.refund_strategies (id) on delete cascade,
  status draft_status not null default 'draft',
  subject text not null,
  body text not null,
  tone draft_tone not null default 'firm_polite',
  approved_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.actions (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases (id) on delete cascade,
  draft_id uuid references public.drafts (id) on delete set null,
  action_type action_type not null,
  status action_status not null default 'pending',
  external_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases (id) on delete cascade,
  role message_role not null,
  message_text text not null,
  tool_name text,
  tool_payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists cases_user_id_created_at_idx on public.cases (user_id, created_at desc);
create index if not exists cases_status_idx on public.cases (status);
create index if not exists artifacts_case_id_idx on public.artifacts (case_id);
create index if not exists research_runs_case_id_idx on public.research_runs (case_id);
create index if not exists research_runs_status_idx on public.research_runs (status);
create index if not exists policy_sources_case_id_idx on public.policy_sources (case_id);
create index if not exists policy_sources_research_run_id_idx on public.policy_sources (research_run_id);
create index if not exists refund_strategies_case_id_idx on public.refund_strategies (case_id);
create index if not exists drafts_case_id_idx on public.drafts (case_id);
create index if not exists actions_case_id_idx on public.actions (case_id);
create index if not exists actions_action_type_idx on public.actions (action_type);
create index if not exists messages_case_id_created_at_idx on public.messages (case_id, created_at desc);

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_cases_updated_at on public.cases;
create trigger set_cases_updated_at
before update on public.cases
for each row execute function public.set_updated_at();

drop trigger if exists set_refund_strategies_updated_at on public.refund_strategies;
create trigger set_refund_strategies_updated_at
before update on public.refund_strategies
for each row execute function public.set_updated_at();

drop trigger if exists set_drafts_updated_at on public.drafts;
create trigger set_drafts_updated_at
before update on public.drafts
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    coalesce(new.email, ''),
    nullif(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = excluded.full_name,
        updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.owns_case(target_case_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.cases c
    where c.id = target_case_id
      and c.user_id = auth.uid()
  );
$$;

alter table public.profiles enable row level security;
alter table public.cases enable row level security;
alter table public.artifacts enable row level security;
alter table public.research_runs enable row level security;
alter table public.policy_sources enable row level security;
alter table public.refund_strategies enable row level security;
alter table public.drafts enable row level security;
alter table public.actions enable row level security;
alter table public.messages enable row level security;

drop policy if exists "Profiles are viewable by owner" on public.profiles;
create policy "Profiles are viewable by owner"
on public.profiles
for select
using (auth.uid() = id);

drop policy if exists "Profiles are insertable by owner" on public.profiles;
create policy "Profiles are insertable by owner"
on public.profiles
for insert
with check (auth.uid() = id);

drop policy if exists "Profiles are updatable by owner" on public.profiles;
create policy "Profiles are updatable by owner"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Cases are manageable by owner" on public.cases;
create policy "Cases are manageable by owner"
on public.cases
for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Artifacts follow parent case ownership" on public.artifacts;
create policy "Artifacts follow parent case ownership"
on public.artifacts
for all
using (public.owns_case(case_id))
with check (public.owns_case(case_id));

drop policy if exists "Research runs follow parent case ownership" on public.research_runs;
create policy "Research runs follow parent case ownership"
on public.research_runs
for all
using (public.owns_case(case_id))
with check (public.owns_case(case_id));

drop policy if exists "Policy sources follow parent case ownership" on public.policy_sources;
create policy "Policy sources follow parent case ownership"
on public.policy_sources
for all
using (public.owns_case(case_id))
with check (public.owns_case(case_id));

drop policy if exists "Strategies follow parent case ownership" on public.refund_strategies;
create policy "Strategies follow parent case ownership"
on public.refund_strategies
for all
using (public.owns_case(case_id))
with check (public.owns_case(case_id));

drop policy if exists "Drafts follow parent case ownership" on public.drafts;
create policy "Drafts follow parent case ownership"
on public.drafts
for all
using (public.owns_case(case_id))
with check (public.owns_case(case_id));

drop policy if exists "Actions follow parent case ownership" on public.actions;
create policy "Actions follow parent case ownership"
on public.actions
for all
using (public.owns_case(case_id))
with check (public.owns_case(case_id));

drop policy if exists "Messages follow parent case ownership" on public.messages;
create policy "Messages follow parent case ownership"
on public.messages
for all
using (public.owns_case(case_id))
with check (public.owns_case(case_id));
