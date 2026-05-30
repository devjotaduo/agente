-- ============================================================================
-- jotaduo-agentes — schema inicial (multi-tenant por RLS)
-- ============================================================================

-- ---------- ENUMs ----------
create type app_role as enum ('admin', 'client');
create type conn_status as enum (
  'disconnected', 'qr_pending', 'connecting', 'connected', 'logged_out', 'error'
);

-- ---------- Util: updated_at ----------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------- profiles (1:1 com auth.users) ----------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role app_role not null default 'client',
  full_name text,
  created_at timestamptz not null default now()
);

-- Cria o profile automaticamente quando um usuário é criado no Auth.
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, coalesce(new.email, ''), 'client')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- is_admin(): SECURITY DEFINER -> bypassa RLS (evita recursão na policy de profiles).
create or replace function is_admin()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- ---------- templates (modelos de persona) ----------
create table templates (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text,
  default_system_prompt text not null,
  default_agent_name text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- agents (1 por cliente no MVP) ----------
create table agents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  template_id uuid references templates(id) on delete set null,
  display_name text not null,
  system_prompt text not null default '',
  model text not null default 'claude-haiku-4-5',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index agents_owner_id_idx on agents(owner_id);
create trigger agents_set_updated_at before update on agents
  for each row execute function set_updated_at();

-- ---------- whatsapp_connections (estado lido pelo painel) ----------
create table whatsapp_connections (
  agent_id uuid primary key references agents(id) on delete cascade,
  status conn_status not null default 'disconnected',
  qr_code text,
  phone_number text,
  connect_requested boolean not null default false,
  last_connected_at timestamptz,
  last_error text,
  updated_at timestamptz not null default now()
);
create trigger wa_conn_set_updated_at before update on whatsapp_connections
  for each row execute function set_updated_at();

-- ---------- whatsapp_sessions (credenciais Baileys; só service_role) ----------
create table whatsapp_sessions (
  agent_id uuid not null references agents(id) on delete cascade,
  key text not null,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (agent_id, key)
);

-- ---------- conversations & messages (histórico p/ o Claude) ----------
create table conversations (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references agents(id) on delete cascade,
  channel text not null default 'test',          -- 'test' | 'whatsapp'
  external_id text,                               -- jid do WhatsApp
  created_at timestamptz not null default now()
);
create index conversations_agent_id_idx on conversations(agent_id);
create unique index conversations_agent_channel_external_idx
  on conversations(agent_id, channel, external_id)
  where external_id is not null;

create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  role text not null,                             -- 'user' | 'assistant'
  content text not null,
  created_at timestamptz not null default now()
);
create index messages_conversation_idx on messages(conversation_id, created_at);

-- ============================================================================
-- RLS
-- ============================================================================
alter table profiles enable row level security;
alter table templates enable row level security;
alter table agents enable row level security;
alter table whatsapp_connections enable row level security;
alter table whatsapp_sessions enable row level security;   -- sem policy = nega tudo
alter table conversations enable row level security;
alter table messages enable row level security;

-- profiles
create policy "profiles self/admin read" on profiles
  for select to authenticated using (id = auth.uid() or is_admin());
create policy "profiles admin update" on profiles
  for update to authenticated using (is_admin()) with check (is_admin());

-- templates
create policy "templates read" on templates
  for select to authenticated using (true);
create policy "templates admin insert" on templates
  for insert to authenticated with check (is_admin());
create policy "templates admin update" on templates
  for update to authenticated using (is_admin()) with check (is_admin());
create policy "templates admin delete" on templates
  for delete to authenticated using (is_admin());

-- agents
create policy "agents owner/admin read" on agents
  for select to authenticated using (owner_id = auth.uid() or is_admin());
create policy "agents admin insert" on agents
  for insert to authenticated with check (is_admin());
create policy "agents owner/admin update" on agents
  for update to authenticated
  using (owner_id = auth.uid() or is_admin())
  with check (owner_id = auth.uid() or is_admin());
create policy "agents admin delete" on agents
  for delete to authenticated using (is_admin());

-- whatsapp_connections (via dono do agente)
create policy "wa_conn owner/admin read" on whatsapp_connections
  for select to authenticated using (
    exists (select 1 from agents a where a.id = agent_id and (a.owner_id = auth.uid() or is_admin()))
  );
create policy "wa_conn owner/admin update" on whatsapp_connections
  for update to authenticated using (
    exists (select 1 from agents a where a.id = agent_id and (a.owner_id = auth.uid() or is_admin()))
  ) with check (
    exists (select 1 from agents a where a.id = agent_id and (a.owner_id = auth.uid() or is_admin()))
  );
create policy "wa_conn admin insert" on whatsapp_connections
  for insert to authenticated with check (is_admin());

-- conversations (via dono do agente)
create policy "conv owner/admin all" on conversations
  for all to authenticated using (
    exists (select 1 from agents a where a.id = agent_id and (a.owner_id = auth.uid() or is_admin()))
  ) with check (
    exists (select 1 from agents a where a.id = agent_id and (a.owner_id = auth.uid() or is_admin()))
  );

-- messages (via dono do agente da conversation)
create policy "msg owner/admin all" on messages
  for all to authenticated using (
    exists (
      select 1 from conversations c join agents a on a.id = c.agent_id
      where c.id = conversation_id and (a.owner_id = auth.uid() or is_admin())
    )
  ) with check (
    exists (
      select 1 from conversations c join agents a on a.id = c.agent_id
      where c.id = conversation_id and (a.owner_id = auth.uid() or is_admin())
    )
  );

-- ============================================================================
-- Realtime: painel assina whatsapp_connections (QR/status ao vivo)
-- ============================================================================
alter publication supabase_realtime add table whatsapp_connections;
