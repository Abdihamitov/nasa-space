-- K2 — Earth System Trend Detective
-- Supabase / PostgreSQL schema. Run in the Supabase SQL editor.
--
-- The app works without Supabase (precomputed JSON cube + in-memory chat),
-- but this schema enables persisted sessions, chat history, exploration
-- analytics and a full normalized data model for production.
--
-- Security model:
--   * catalog tables are public read (anon) for transparency;
--   * analytics tables are service-role only (no public policies);
--   * all writes from the app go through server routes with the service key.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Analytics / product telemetry
-- ---------------------------------------------------------------------------

create table if not exists sessions (
  id text primary key,
  user_agent text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id text not null references sessions(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  context jsonb,
  model text,
  created_at timestamptz not null default now()
);
create index if not exists chat_messages_session_idx on chat_messages(session_id, created_at desc);

create table if not exists explorations (
  id uuid primary key default gen_random_uuid(),
  session_id text not null references sessions(id) on delete cascade,
  object_code text,
  variable_code text,
  period_from int,
  period_to int,
  path text,
  created_at timestamptz not null default now()
);
create index if not exists explorations_session_idx on explorations(session_id, created_at desc);
create index if not exists explorations_object_idx on explorations(object_code, variable_code);

create table if not exists feedback (
  id uuid primary key default gen_random_uuid(),
  session_id text not null references sessions(id) on delete cascade,
  object_code text,
  variable_code text,
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);
create index if not exists feedback_session_idx on feedback(session_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Catalog / normalized data model (production path)
-- ---------------------------------------------------------------------------

create table if not exists sections (
  code text primary key,
  name text not null,
  name_en text,
  description text,
  accent text,
  icon text,
  sort_order int not null default 0
);

create table if not exists sources (
  code text primary key,
  name text not null,
  url text,
  license text,
  citation text
);

create table if not exists variables (
  code text primary key,
  section_code text not null references sections(code),
  name text not null,
  name_en text,
  short_name text,
  unit text not null,
  display_unit text,
  display_scale double precision default 1,
  yearly_agg text not null check (yearly_agg in ('mean', 'sum', 'max')),
  season_months int[],
  native_step text not null check (native_step in ('month', 'year')),
  direction_note text,
  description text,
  why_it_matters text,
  source_code text references sources(code),
  dataset text,
  precision int default 2,
  is_proxy boolean default false,
  proxy_note text,
  is_reconstruction boolean default false,
  reconstruction_note text,
  color text
);

create table if not exists objects (
  code text primary key,
  type text not null,
  name text not null,
  name_en text,
  lat double precision,
  lon double precision,
  region text,
  elevation double precision,
  area_km2 double precision,
  description text,
  tags text[] default '{}',
  geom jsonb,
  marker jsonb,
  parent_code text references objects(code),
  is_grid boolean default false,
  is_global boolean default false,
  is_regulated boolean default false,
  regulated_note text,
  is_proxy boolean default false,
  highlight boolean default false
);
create index if not exists objects_type_idx on objects(type);
create index if not exists objects_region_idx on objects(region);

create table if not exists series (
  id text primary key,
  object_code text not null references objects(code),
  variable_code text not null references variables(code),
  source_code text references sources(code),
  dataset_id text,
  native_step text not null check (native_step in ('month', 'year')),
  date_from date,
  date_to date,
  is_proxy boolean default false,
  is_reconstruction boolean default false,
  coverage double precision,
  unique (object_code, variable_code, source_code, dataset_id)
);
create index if not exists series_object_idx on series(object_code);
create index if not exists series_variable_idx on series(variable_code);

create table if not exists observations (
  id bigserial primary key,
  series_id text not null references series(id) on delete cascade,
  date date not null,
  value double precision not null,
  quality text not null default 'ok' check (quality in ('ok', 'filled', 'outlier', 'reconstructed', 'missing')),
  unique (series_id, date)
);
create index if not exists observations_series_date_idx on observations(series_id, date);

create table if not exists trend_results (
  id bigserial primary key,
  series_id text not null references series(id) on delete cascade,
  date_from int not null,
  date_to int not null,
  agg text not null,
  trend text,
  p_value double precision,
  q_value double precision,
  tau double precision,
  sen_slope double precision,
  slope_ci_low double precision,
  slope_ci_high double precision,
  intercept double precision,
  n_years int,
  method text,
  missing_share double precision,
  computed_at timestamptz not null default now(),
  unique (series_id, date_from, date_to, agg)
);

create table if not exists chain_templates (
  id text primary key,
  section_code text references sections(code),
  target_variable text references variables(code),
  name text not null,
  description text
);

create table if not exists chain_links (
  id bigserial primary key,
  template_id text not null references chain_templates(id) on delete cascade,
  sort_order int not null,
  variable_code text not null references variables(code),
  expected_relation text not null check (expected_relation in ('+', '-')),
  explanation_text text,
  unique (template_id, sort_order)
);

create table if not exists phenomena (
  code text primary key,
  name text not null,
  name_en text,
  description text,
  global_variable text references variables(code),
  global_label text,
  caveat text,
  accent text,
  icon text
);

create table if not exists phenomenon_objects (
  id bigserial primary key,
  phenomenon_code text not null references phenomena(code) on delete cascade,
  object_code text not null references objects(code) on delete cascade,
  local_variable text not null references variables(code),
  weight double precision default 1,
  note text,
  unique (phenomenon_code, object_code, local_variable)
);

create table if not exists ingest_runs (
  id bigserial primary key,
  source_code text,
  started_at timestamptz,
  finished_at timestamptz,
  status text,
  rows int,
  error text
);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table sections enable row level security;
alter table sources enable row level security;
alter table variables enable row level security;
alter table objects enable row level security;
alter table series enable row level security;
alter table observations enable row level security;
alter table trend_results enable row level security;
alter table chain_templates enable row level security;
alter table chain_links enable row level security;
alter table phenomena enable row level security;
alter table phenomenon_objects enable row level security;
alter table ingest_runs enable row level security;

alter table sessions enable row level security;
alter table chat_messages enable row level security;
alter table explorations enable row level security;
alter table feedback enable row level security;

-- Public, read-only catalog. Analytics tables intentionally have no public
-- policies: only the service role (server routes) can read/write them.
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'sections' and policyname = 'public_read_sections') then
    execute 'create policy public_read_sections on sections for select using (true)';
  end if;
  if not exists (select 1 from pg_policies where tablename = 'sources' and policyname = 'public_read_sources') then
    execute 'create policy public_read_sources on sources for select using (true)';
  end if;
  if not exists (select 1 from pg_policies where tablename = 'variables' and policyname = 'public_read_variables') then
    execute 'create policy public_read_variables on variables for select using (true)';
  end if;
  if not exists (select 1 from pg_policies where tablename = 'objects' and policyname = 'public_read_objects') then
    execute 'create policy public_read_objects on objects for select using (true)';
  end if;
  if not exists (select 1 from pg_policies where tablename = 'series' and policyname = 'public_read_series') then
    execute 'create policy public_read_series on series for select using (true)';
  end if;
  if not exists (select 1 from pg_policies where tablename = 'observations' and policyname = 'public_read_observations') then
    execute 'create policy public_read_observations on observations for select using (true)';
  end if;
  if not exists (select 1 from pg_policies where tablename = 'trend_results' and policyname = 'public_read_trends') then
    execute 'create policy public_read_trends on trend_results for select using (true)';
  end if;
  if not exists (select 1 from pg_policies where tablename = 'chain_templates' and policyname = 'public_read_chain_templates') then
    execute 'create policy public_read_chain_templates on chain_templates for select using (true)';
  end if;
  if not exists (select 1 from pg_policies where tablename = 'chain_links' and policyname = 'public_read_chain_links') then
    execute 'create policy public_read_chain_links on chain_links for select using (true)';
  end if;
  if not exists (select 1 from pg_policies where tablename = 'phenomena' and policyname = 'public_read_phenomena') then
    execute 'create policy public_read_phenomena on phenomena for select using (true)';
  end if;
  if not exists (select 1 from pg_policies where tablename = 'phenomenon_objects' and policyname = 'public_read_phenomenon_objects') then
    execute 'create policy public_read_phenomenon_objects on phenomenon_objects for select using (true)';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Helpful view for the product team
-- ---------------------------------------------------------------------------

create or replace view exploration_funnel as
select
  e.object_code,
  e.variable_code,
  count(*) as views,
  count(distinct e.session_id) as sessions,
  min(e.created_at) as first_seen,
  max(e.created_at) as last_seen
from explorations e
group by e.object_code, e.variable_code
order by views desc;
