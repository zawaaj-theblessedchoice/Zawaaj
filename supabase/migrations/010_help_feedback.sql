create table if not exists help_feedback (
  id uuid primary key default gen_random_uuid(),
  article_slug text not null,
  helpful boolean not null,
  created_at timestamptz default now()
);
