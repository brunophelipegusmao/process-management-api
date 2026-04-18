# Fase 08 - Modulo de processos

## Objetivo

Implementar o nucleo do dominio juridico, que passa a ser a base para audiencias, testemunhas, prazos e relatorios.

## Escopo

- ProcessesModule completo.
- Regras de CNJ unico.
- Campos principais do processo.
- Ligacao com cliente.

## Skills para execucao

- Essenciais: nestjs-expert, drizzle-orm-expert, zod-validation-expert, postgres-best-practices, backend-dev-guidelines, api-patterns, typescript-expert.
- Sob demanda: tdd-workflow, systematic-debugging.

## Tarefas

- Implementar CRUD de processos.
- Garantir unicidade do numero CNJ.
- Respeitar defaults de client_side e status.
- Preparar consultas por cliente, status e tribunal.
- Expor contratos que serao consumidos por prazos e audiencias.

## Entregaveis

- Modulo de processos funcional.
- Endpoints e consultas basicas do dominio principal.

## Dependencias

- Fase 07.

## Criterios de aceite

- Nao existe processo duplicado por CNJ.
- Processo referencia cliente existente.
- O modulo fica pronto para ativar as regras dependentes de audiencia e testemunha.

## Observacoes

- Evitar colocar regras de audiencia ou testemunha dentro deste modulo.
