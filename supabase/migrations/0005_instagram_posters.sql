-- ============================================================================
-- Instagram + pôsteres gerados por IA
-- O agente cria a arte (DashScope/Tongyi Wanxiang) e publica no Instagram
-- (Graph API). A imagem é hospedada no Storage (bucket público) para que a
-- Graph API consiga buscá-la por URL.
-- ============================================================================

create type poster_status as enum (
  'draft', 'generating', 'ready', 'publishing', 'published', 'failed'
);
create type ig_status as enum ('disconnected', 'connected', 'error');

-- ---------- instagram_connections (estado legível pelo painel; SEM o token) ----------
create table instagram_connections (
  agent_id uuid primary key references agents(id) on delete cascade,
  ig_user_id text,
  username text,
  status ig_status not null default 'disconnected',
  token_expires_at timestamptz,
  last_error text,
  updated_at timestamptz not null default now()
);
create trigger ig_conn_set_updated_at before update on instagram_connections
  for each row execute function set_updated_at();

-- ---------- instagram_secrets (token de longa duração; só service_role) ----------
create table instagram_secrets (
  agent_id uuid primary key references agents(id) on delete cascade,
  access_token text not null,
  updated_at timestamptz not null default now()
);

-- ---------- posters ----------
create table posters (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references agents(id) on delete cascade,
  briefing text not null,                 -- pedido do admin (linguagem natural)
  image_prompt text,                      -- prompt expandido enviado ao gerador
  caption text,                           -- legenda do post (PT-BR + hashtags)
  image_path text,                        -- caminho no bucket 'posters'
  image_url text,                         -- URL público (Storage)
  size text not null default '1080x1080',
  status poster_status not null default 'draft',
  ig_media_id text,
  ig_permalink text,
  error text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);
create index posters_agent_idx on posters(agent_id, created_at desc);
create trigger posters_set_updated_at before update on posters
  for each row execute function set_updated_at();

-- ============================================================================
-- RLS
-- ============================================================================
alter table instagram_connections enable row level security;
alter table instagram_secrets enable row level security;   -- sem policy = nega tudo (só service_role)
alter table posters enable row level security;

-- instagram_connections: dono/admin leem; só admin escreve (a conexão é configurada no painel admin)
create policy "ig_conn owner/admin read" on instagram_connections
  for select to authenticated using (
    exists (select 1 from agents a where a.id = agent_id and (a.owner_id = auth.uid() or is_admin()))
  );
create policy "ig_conn admin write" on instagram_connections
  for all to authenticated using (is_admin()) with check (is_admin());

-- posters: dono do agente ou admin
create policy "posters owner/admin all" on posters
  for all to authenticated using (
    exists (select 1 from agents a where a.id = agent_id and (a.owner_id = auth.uid() or is_admin()))
  ) with check (
    exists (select 1 from agents a where a.id = agent_id and (a.owner_id = auth.uid() or is_admin()))
  );

-- ============================================================================
-- Storage: bucket público para as imagens dos pôsteres
-- (público é necessário para a Graph API do Instagram buscar a imagem por URL)
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('posters', 'posters', true)
on conflict (id) do nothing;

-- Leitura pública das imagens do bucket (os uploads são feitos via service_role).
create policy "posters images public read" on storage.objects
  for select to public using (bucket_id = 'posters');

-- ============================================================================
-- Realtime: painel acompanha o status do pôster (generating -> ready -> published)
-- ============================================================================
alter publication supabase_realtime add table posters;
