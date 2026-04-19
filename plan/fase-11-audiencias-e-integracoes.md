# Fase 11 - Modulo de audiencias e integracoes de negocio

Status: concluida

## Objetivo

Implementar audiencias e acionar os efeitos cruzados sobre testemunhas, prazos e comunicacoes.

## Escopo

- HearingsModule.
- Criacao e gestao de audiencias.
- Cancelamento e redesignacao.
- Integracao com testemunhas, prazos e email.

## Skills para execucao

- Essenciais: nestjs-expert, drizzle-orm-expert, zod-validation-expert, backend-dev-guidelines, api-patterns, typescript-expert, tdd-workflow.
- Sob demanda: systematic-debugging.

## Tarefas

- Implementar CRUD e consultas de audiencias por processo.
- Respeitar ativacao do modulo de testemunhas apenas para AIJ, oitiva e ACIJ.
- Implementar cancelamento com cancelamento de prazos do processo e disparo E4.
- Implementar redesignacao com cancelamento, disparo E5 e geracao de novos prazos.
- Tratar regra de notificacao interna quando o reagendamento superar 30 dias e houver testemunhas intimadas.

## Entregaveis

- Modulo de audiencias funcional.
- Orquestracao das regras de cancelamento e redesignacao.

## Dependencias

- Fase 10.

## Criterios de aceite

- Audiencia de conciliacao nao ativa fluxo de testemunhas.
- Cancelamento e redesignacao propagam corretamente efeitos colaterais.
- As integracoes nao quebram a separacao entre controller, service e repository.

## Observacoes

- Esta fase consolida o comportamento dinamico entre modulos de dominio.
- Implementacao concluida com HearingsController, HearingsService e HearingsRepository.
- Cancelamento de audiencia passou a cancelar prazos abertos do processo e retornar marcador E4.
- Redesignacao passou a cancelar prazos abertos, recriar prazos relativos a audiencia e retornar marcador E5.
- Reagendamento acima de 30 dias com testemunhas intimadas gera notificacao interna preparada no retorno do service.
