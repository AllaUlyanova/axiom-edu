
-- Enums
create type public.chat_conversation_status as enum ('active', 'escalated', 'ordered', 'closed');
create type public.chat_message_role as enum ('user', 'assistant', 'operator', 'system');
create type public.chat_ticket_kind as enum ('order', 'operator_request');
create type public.chat_ticket_status as enum ('new', 'in_progress', 'done');

-- Visitors
create table public.chat_visitors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  consent_at timestamptz not null default now(),
  user_id uuid,
  user_agent text,
  created_at timestamptz not null default now()
);
alter table public.chat_visitors enable row level security;
create policy "admins manage chat_visitors" on public.chat_visitors
  for all to authenticated
  using (has_role(auth.uid(), 'admin'::app_role))
  with check (has_role(auth.uid(), 'admin'::app_role));

-- Conversations
create table public.chat_conversations (
  id uuid primary key default gen_random_uuid(),
  visitor_id uuid not null references public.chat_visitors(id) on delete cascade,
  status public.chat_conversation_status not null default 'active',
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index chat_conversations_visitor_idx on public.chat_conversations(visitor_id);
create index chat_conversations_last_msg_idx on public.chat_conversations(last_message_at desc);
alter table public.chat_conversations enable row level security;
create policy "admins manage chat_conversations" on public.chat_conversations
  for all to authenticated
  using (has_role(auth.uid(), 'admin'::app_role))
  with check (has_role(auth.uid(), 'admin'::app_role));

-- Messages
create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.chat_conversations(id) on delete cascade,
  role public.chat_message_role not null,
  content text not null,
  created_at timestamptz not null default now()
);
create index chat_messages_conversation_idx on public.chat_messages(conversation_id, created_at);
alter table public.chat_messages enable row level security;
create policy "admins manage chat_messages" on public.chat_messages
  for all to authenticated
  using (has_role(auth.uid(), 'admin'::app_role))
  with check (has_role(auth.uid(), 'admin'::app_role));

-- Tickets
create table public.chat_tickets (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.chat_conversations(id) on delete cascade,
  kind public.chat_ticket_kind not null,
  subject_id uuid,
  lesson_id uuid,
  book_id uuid,
  note text,
  status public.chat_ticket_status not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index chat_tickets_conversation_idx on public.chat_tickets(conversation_id);
create index chat_tickets_status_idx on public.chat_tickets(status, created_at desc);
alter table public.chat_tickets enable row level security;
create policy "admins manage chat_tickets" on public.chat_tickets
  for all to authenticated
  using (has_role(auth.uid(), 'admin'::app_role))
  with check (has_role(auth.uid(), 'admin'::app_role));

create trigger chat_tickets_set_updated_at
  before update on public.chat_tickets
  for each row execute function public.tg_set_updated_at();

-- Realtime
alter table public.chat_messages replica identity full;
alter table public.chat_tickets replica identity full;
alter table public.chat_conversations replica identity full;
alter publication supabase_realtime add table public.chat_messages;
alter publication supabase_realtime add table public.chat_tickets;
alter publication supabase_realtime add table public.chat_conversations;
