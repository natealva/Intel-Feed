-- Intel Feed database schema
-- Run this in your Supabase SQL editor to create the tables.

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  digest_email text,
  created_at timestamptz default now()
);

create table if not exists topics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade not null,
  name text not null,
  created_at timestamptz default now()
);

create table if not exists articles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade not null,
  topic_id uuid references topics(id) on delete cascade not null,
  title text not null,
  summary text,
  source_url text,
  published_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists email_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade not null,
  sent_at timestamptz default now(),
  status text not null default 'pending'
);

create table if not exists briefings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade not null,
  content text not null,
  created_at timestamptz default now()
);

-- Indexes for common queries
create index if not exists idx_briefings_user_id on briefings(user_id, created_at desc);
create index if not exists idx_topics_user_id on topics(user_id);
create index if not exists idx_articles_user_id on articles(user_id);
create index if not exists idx_articles_topic_id on articles(topic_id);
create index if not exists idx_articles_created_at on articles(created_at desc);
create index if not exists idx_email_logs_user_id on email_logs(user_id);
