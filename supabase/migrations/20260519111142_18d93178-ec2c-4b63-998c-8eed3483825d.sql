
-- pgvector
create extension if not exists vector;

-- units
create table public.units (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null,
  number int not null,
  title text not null,
  summary text,
  page_from int,
  page_to int,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.units enable row level security;
create policy "units public read" on public.units for select using (true);
create policy "admins manage units" on public.units for all to authenticated
  using (has_role(auth.uid(), 'admin')) with check (has_role(auth.uid(), 'admin'));
create index units_book_idx on public.units(book_id, number);

alter table public.lessons add column if not exists unit_id uuid;
create index if not exists lessons_unit_idx on public.lessons(unit_id);

-- exercises
create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null,
  number text not null,
  prompt text,
  instruction text,
  page_number int,
  source_image_url text,
  type text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.exercises enable row level security;
create policy "exercises public read" on public.exercises for select using (true);
create policy "admins manage exercises" on public.exercises for all to authenticated
  using (has_role(auth.uid(), 'admin')) with check (has_role(auth.uid(), 'admin'));
create index exercises_lesson_idx on public.exercises(lesson_id, sort_order);

alter table public.tasks add column if not exists exercise_id uuid;

-- vocabulary
create table public.vocabulary (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null,
  unit_id uuid,
  lesson_id uuid,
  word text not null,
  translation text,
  transcription text,
  example text,
  page_number int,
  created_at timestamptz not null default now()
);
alter table public.vocabulary enable row level security;
create policy "vocab public read" on public.vocabulary for select using (true);
create policy "admins manage vocab" on public.vocabulary for all to authenticated
  using (has_role(auth.uid(), 'admin')) with check (has_role(auth.uid(), 'admin'));
create index vocab_book_idx on public.vocabulary(book_id);
create index vocab_lesson_idx on public.vocabulary(lesson_id);

-- grammar topics
create table public.grammar_topics (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null,
  unit_id uuid,
  lesson_id uuid,
  title text not null,
  rule_md text,
  examples jsonb default '[]'::jsonb,
  page_number int,
  created_at timestamptz not null default now()
);
alter table public.grammar_topics enable row level security;
create policy "grammar public read" on public.grammar_topics for select using (true);
create policy "admins manage grammar" on public.grammar_topics for all to authenticated
  using (has_role(auth.uid(), 'admin')) with check (has_role(auth.uid(), 'admin'));
create index grammar_book_idx on public.grammar_topics(book_id);
create index grammar_lesson_idx on public.grammar_topics(lesson_id);

-- ingest jobs
create table public.ingest_jobs (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null,
  status text not null default 'queued',
  progress int not null default 0,
  total int not null default 0,
  log text,
  error text,
  started_at timestamptz default now(),
  finished_at timestamptz
);
alter table public.ingest_jobs enable row level security;
create policy "admins manage ingest jobs" on public.ingest_jobs for all to authenticated
  using (has_role(auth.uid(), 'admin')) with check (has_role(auth.uid(), 'admin'));

-- book_chunks for RAG
create table public.book_chunks (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null,
  unit_id uuid,
  lesson_id uuid,
  page_number int,
  kind text not null default 'page',
  content text not null,
  embedding vector(1536) not null,
  created_at timestamptz not null default now()
);
alter table public.book_chunks enable row level security;
create policy "chunks public read" on public.book_chunks for select using (true);
create policy "admins manage chunks" on public.book_chunks for all to authenticated
  using (has_role(auth.uid(), 'admin')) with check (has_role(auth.uid(), 'admin'));
create index book_chunks_book_idx on public.book_chunks(book_id);
create index book_chunks_embedding_idx on public.book_chunks
  using hnsw (embedding vector_cosine_ops);

-- RPC for semantic search
create or replace function public.match_book_chunks(
  query_embedding vector(1536),
  book_ids uuid[],
  match_count int default 8
)
returns table (
  id uuid,
  book_id uuid,
  unit_id uuid,
  lesson_id uuid,
  page_number int,
  kind text,
  content text,
  similarity float
)
language sql stable
set search_path = public
as $$
  select c.id, c.book_id, c.unit_id, c.lesson_id, c.page_number, c.kind, c.content,
    1 - (c.embedding <=> query_embedding) as similarity
  from public.book_chunks c
  where (book_ids is null or c.book_id = any(book_ids))
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

-- english subject
insert into public.subjects (slug, name, icon, color, description, sort_order)
values ('english', 'Английский язык', '🇬🇧', '#3b82f6', 'Spotlight 3 — учим английский с AI-наставником', 2)
on conflict (slug) do nothing;
