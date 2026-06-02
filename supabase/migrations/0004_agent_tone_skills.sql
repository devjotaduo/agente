-- Tom de voz e skills do agente (usados no wizard de criação e no system prompt).
alter table agents add column tone text not null default '';
alter table agents add column skills text[] not null default '{}';
