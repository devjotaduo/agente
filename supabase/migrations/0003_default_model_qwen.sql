-- Troca o LLM padrão para Qwen (Alibaba/DashScope, compatível com OpenAI).
alter table agents alter column model set default 'qwen-plus';
update agents set model = 'qwen-plus' where model = 'claude-haiku-4-5';
