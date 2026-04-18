# Fase 09 - Modulo de prazos e motor de dias uteis

## Objetivo

Construir a infraestrutura de calculo de prazos e a base de feriados que sera reutilizada em todo o dominio.

## Escopo

- DeadlinesModule.
- HolidaysService.
- Regras de prazo por tipo.
- Calculo de dias uteis com feriados nacionais, estaduais e municipais.

## Skills para execucao

- Essenciais: nestjs-expert, drizzle-orm-expert, postgres-best-practices, zod-validation-expert, backend-dev-guidelines, typescript-expert.
- Sob demanda: postgresql-optimization, tdd-workflow, systematic-debugging.

## Tarefas

- Implementar entidade e repository de deadlines.
- Implementar HolidaysService e estrategia de consulta por abrangencia.
- Implementar calculo para dias uteis e dias corridos conforme tipo de prazo.
- Implementar validacoes de criacao de prazo, inclusive bloqueio para testemunha substituida.
- Preparar cancelamento e atualizacao de status de prazos.

## Entregaveis

- Motor de prazo reutilizavel.
- Servico de feriados pronto para alimentacao manual e automatica.

## Dependencias

- Fase 08.

## Criterios de aceite

- Cada tipo de prazo respeita a regra temporal do CLAUDE.md.
- GATE-4 e refletido na criacao de deadlines.
- O motor diferencia corretamente dias uteis e corridos.

## Observacoes

- O desenho desta fase deve favorecer reuso por testemunhas, audiencias e jobs.
