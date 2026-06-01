-- Distingue COMO a conta do Instagram foi conectada, pois muda o host da API:
--   'facebook_page'    -> publica via graph.facebook.com (token de Página)
--   'instagram_login'  -> publica via graph.instagram.com (login direto do IG, sem Página)
alter table instagram_connections
  add column if not exists auth_type text not null default 'facebook_page';
