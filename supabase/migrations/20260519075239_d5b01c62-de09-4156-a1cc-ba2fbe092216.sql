
-- Storage buckets
insert into storage.buckets (id, name, public)
values ('textbooks', 'textbooks', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('textbook-pages', 'textbook-pages', true)
on conflict (id) do nothing;

-- Public read for textbook-pages
create policy "textbook pages public read"
on storage.objects for select to public
using (bucket_id = 'textbook-pages');

-- Admins write textbooks & pages
create policy "admins write textbooks"
on storage.objects for all to authenticated
using (bucket_id in ('textbooks','textbook-pages') and has_role(auth.uid(),'admin'::app_role))
with check (bucket_id in ('textbooks','textbook-pages') and has_role(auth.uid(),'admin'::app_role));

-- Schema additions
alter table public.books add column if not exists pages_count integer;
alter table public.lessons add column if not exists page_from integer;
alter table public.lessons add column if not exists page_to integer;
alter table public.lessons add column if not exists ocr_text text;
alter table public.tasks add column if not exists page_number integer;
alter table public.tasks add column if not exists source_image_url text;

-- Pages table: one row per scanned page (so UI can render the textbook flipbook)
create table if not exists public.book_pages (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete cascade,
  page_number integer not null,
  image_url text not null,
  ocr_text text,
  created_at timestamptz not null default now(),
  unique (book_id, page_number)
);
alter table public.book_pages enable row level security;

create policy "book pages public read"
on public.book_pages for select to public using (true);

create policy "admins manage book pages"
on public.book_pages for all to authenticated
using (has_role(auth.uid(),'admin'::app_role))
with check (has_role(auth.uid(),'admin'::app_role));
