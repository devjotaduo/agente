-- Dados opcionais da empresa e detalhes específicos do template do agente.
alter table agents add column business_profile jsonb not null default '{}'::jsonb;
