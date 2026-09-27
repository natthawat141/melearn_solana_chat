-- Melearn Chat user data. Lesson copy stays in content/*.json.
-- Service role used by Next.js server routes bypasses RLS.
-- Authenticated policies are ready for Supabase Auth (auth.uid()).

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null unique,
  locale text not null default 'th',
  level text,
  goal text,
  onboarded boolean not null default false,
  wallet_address text,
  created_at timestamptz not null default now()
);

create table if not exists public.user_progress (
  user_id uuid not null references public.profiles (id) on delete cascade,
  lesson_id text not null,
  lesson_version integer not null,
  status text not null,
  attempts integer not null default 0,
  hints_used integer not null default 0,
  phase text not null default 'chat',
  practice_index integer not null default 0,
  results jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create table if not exists public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  teacher_id text not null,
  lesson_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.chat_sessions (id) on delete cascade,
  role text not null,
  text text not null,
  client_message_id text,
  mode text,
  created_at timestamptz not null default now()
);

create unique index if not exists chat_messages_client_idx
  on public.chat_messages (session_id, client_message_id, role);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  lesson_id text not null,
  price_lamports bigint not null,
  network text not null default 'devnet',
  recipient text not null,
  payer text,
  status text not null,
  signature text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists transactions_signature_idx
  on public.transactions (network, signature)
  where signature is not null;

create table if not exists public.entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  lesson_id text not null,
  transaction_id uuid not null unique references public.transactions (id),
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  unique (user_id, lesson_id)
);

alter table public.profiles enable row level security;
alter table public.user_progress enable row level security;
alter table public.chat_sessions enable row level security;
alter table public.chat_messages enable row level security;
alter table public.transactions enable row level security;
alter table public.entitlements enable row level security;

create policy profiles_self on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy progress_self on public.user_progress
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy sessions_self on public.chat_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy messages_self on public.chat_messages
  for all using (
    exists (select 1 from public.chat_sessions s where s.id = session_id and s.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.chat_sessions s where s.id = session_id and s.user_id = auth.uid())
  );

create policy transactions_self on public.transactions
  for select using (auth.uid() = user_id);

create policy entitlements_self on public.entitlements
  for select using (auth.uid() = user_id);
