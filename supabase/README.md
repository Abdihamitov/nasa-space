# Supabase setup

K2 works without Supabase. This directory prepares the production path and
powers chat history, exploration analytics and feedback.

## 1. Create a project

1. Go to <https://supabase.com> → New project.
2. Copy **Project URL** and **service_role key** (Settings → API).
3. Put them in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

> The service role key is server-only. Never expose it to the browser.

## 2. Apply the schema

Open **SQL Editor** in Supabase and run `migrations/0001_init.sql`.

It creates:

- analytics: `sessions`, `chat_messages`, `explorations`, `feedback`;
- catalog: `sections`, `sources`, `variables`, `objects`, `series`,
  `observations`, `trend_results`;
- hypotheses: `chain_templates`, `chain_links`;
- phenomena: `phenomena`, `phenomenon_objects`;
- `ingest_runs` and the `exploration_funnel` view.

RLS is enabled. Catalog tables have public read policies; analytics tables are
service-role only.

## 3. Seed the cube

```bash
npm run seed
```

The script is idempotent:

- upserts catalog rows by primary key;
- upserts observations by `(series_id, date)`;
- precomputes default 2000–2025 trends;
- replaces chain links and phenomenon links;
- writes an `ingest_runs` row.

## 4. What the app writes

- `POST /api/chat` → `sessions` + `chat_messages`;
- `POST /api/explore` → `explorations` (anonymous session id from localStorage);
- `POST /api/feedback` → `feedback`.

If env vars are missing, all calls are no-ops and the app keeps working.

## Useful queries

```sql
-- what people explore
select object_code, variable_code, count(*) as views
from explorations
group by 1, 2
order by views desc
limit 20;

-- latest AI conversations
select session_id, role, left(content, 120) as preview, created_at
from chat_messages
order by created_at desc
limit 20;

-- feedback
select object_code, variable_code, rating, count(*)
from feedback
group by 1, 2, 3
order by 4 desc;
```
