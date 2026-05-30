-- Endurecimento de segurança (advisors do Supabase).

-- 1) search_path fixo na função de updated_at.
create or replace function set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 2) handle_new_user é função de trigger; ninguém deve chamá-la via RPC.
--    (Triggers executam independentemente do EXECUTE do usuário.)
revoke execute on function handle_new_user() from public, anon, authenticated;

-- 3) is_admin() é usada nas policies (precisa de EXECUTE p/ authenticated),
--    mas anon não precisa chamá-la.
revoke execute on function is_admin() from anon;

-- 4) Documenta a ausência intencional de policy em whatsapp_sessions
--    (acesso só via service_role no worker).
comment on table whatsapp_sessions is
  'Credenciais Baileys. RLS habilitado sem policy: acessível apenas via service_role (worker).';
