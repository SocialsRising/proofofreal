-- Meme Maxxers Launchpad registry. Run once in the Supabase SQL editor.
create table if not exists launchpad_tokens (
  id text primary key,               -- lowercase token address
  data jsonb not null,
  created_at timestamptz not null default now()
);
create table if not exists launchpad_submissions (
  id uuid primary key,
  data jsonb not null,
  created_at timestamptz not null default now()
);
-- Public bucket for token images (Clanker metadata needs a URL).
insert into storage.buckets (id, name, public) values ('launchpad', 'launchpad', true) on conflict (id) do nothing;
-- Rows are written only through the server with the service role key; no RLS policies needed for anon.
alter table launchpad_tokens enable row level security;
alter table launchpad_submissions enable row level security;
