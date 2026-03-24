-- Seed script for Intel Feed
-- Run this in your Supabase SQL editor after schema.sql

-- Create a test user with a known UUID
insert into users (id, email)
values ('11111111-1111-1111-1111-111111111111', 'test@intelfeed.dev')
on conflict (id) do nothing;

-- Add some topics for the test user
insert into topics (user_id, name) values
  ('11111111-1111-1111-1111-111111111111', 'AI and machine learning'),
  ('11111111-1111-1111-1111-111111111111', 'US economic policy'),
  ('11111111-1111-1111-1111-111111111111', 'SpaceX and commercial spaceflight')
on conflict do nothing;
