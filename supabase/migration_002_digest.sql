-- Migration: add digest_email to users, create briefings table
-- Run this if you already have the base schema applied.

alter table users add column if not exists digest_email text;

create table if not exists briefings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade not null,
  content text not null,
  created_at timestamptz default now()
);

create index if not exists idx_briefings_user_id on briefings(user_id, created_at desc);
