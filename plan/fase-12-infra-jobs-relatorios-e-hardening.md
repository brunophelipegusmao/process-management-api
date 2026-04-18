# Fase 12 - Infra complementar, jobs, relatorios e hardening

## Objetivo

Fechar o backend com automacoes, comunicacoes, agregacoes e preparacao para uso sustentavel em ambiente real.

## Escopo

- EmailService.
- JOB-FERIADOS.
- JOB-PRAZOS.
- ReportsModule.
- Hardening tecnico e cobertura essencial.

## Skills para execucao

- Essenciais: nestjs-expert, backend-dev-guidelines, drizzle-orm-expert, postgres-best-practices, api-patterns, typescript-expert.
- Sob demanda: postgresql-optimization, tdd-workflow, documentation-templates, systematic-debugging.

## Tarefas

- Implementar EmailService com provedor plugavel.
- Estruturar templates E1 a E6.
- Implementar JOB-FERIADOS com upsert respeitando source manual.
- Implementar JOB-PRAZOS com transacoes isoladas por passo e auditoria JOB_PRAZOS.
- Implementar ReportsModule com acesso restrito a advogado e superadmin.
- Revisar logs, observabilidade, validacoes finais e testes prioritarios.
- Atualizar README tecnico e instrucoes operacionais.

## Entregaveis

- Automacoes e notificacoes basicas prontas.
- Relatorios iniciais disponiveis.
- Projeto endurecido para continuidade do desenvolvimento.

## Dependencias

- Fase 11.

## Criterios de aceite

- Jobs executam sem sobrescrever feriados manuais indevidamente.
- JOB-PRAZOS grava auditoria append-only.
- Relatorios ficam restritos aos perfis corretos.
- O backend encerra o ciclo principal previsto no CLAUDE.md.

## Observacoes

- Decisoes pendentes de canal interno e provedor de email devem ser fechadas nesta fase ou explicitamente adiadas com impacto documentado.
