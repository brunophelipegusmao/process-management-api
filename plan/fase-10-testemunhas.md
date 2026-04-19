# Fase 10 - Modulo de testemunhas

## Status

Concluida.

## Objetivo

Implementar o modulo mais sensivel do dominio, cobrindo cadastro, limites, substituicao, desistencias e efeitos sobre prazos.

## Escopo

- WitnessesModule.
- Regras de cadastro completo e incompleto.
- Limites por tipo de juizo.
- Substituicao e desistencia.
- Integracao com prazos e email.

## Skills para execucao

- Essenciais: nestjs-expert, drizzle-orm-expert, zod-validation-expert, backend-dev-guidelines, api-patterns, typescript-expert, tdd-workflow.
- Sob demanda: systematic-debugging.

## Tarefas

- Implementar CRUD e consultas de testemunhas por processo.
- Bloquear documentos proibidos no payload e no schema.
- Aplicar limite de 10 para vara e 4 para JEC, excluindo replaced=true e desistida.
- Gerar prazo DADOS_TESTEMUNHA quando os dados estiverem incompletos.
- Implementar substituicao transacional com cancelamento de prazos ativos.
- Implementar desistencias com cancelamento de prazos ativos.
- Preparar eventos para notificacoes E1 e E3 onde aplicavel.

## Entregaveis

- Modulo de testemunhas funcional.
- Regras criticas do dominio implementadas.

## Dependencias

- Fase 09.

## Criterios de aceite

- GATE-1 e GATE-2 estao garantidos no service.
- Substituicao ocorre em transacao e nao conta para o limite.
- Testemunha substituida permanece em estado terminal.

## Observacoes

- Esta fase exige maior rigor de validacao e testes de regra de negocio.

## Progresso concluido

- WitnessesModule implementado com controller, service e repository.
- GATE-1 garantido no schema compartilhado com bloqueio explicito de cpf, rg, cnh e campos equivalentes.
- GATE-2 implementado no service com limite por courtType: vara=10 e jec=4, excluindo replaced=true e status=desistida.
- Cadastro incompleto gera prazo dados_testemunha e prepara notificacao E1.
- Substituicao ocorre em transacao, marca a original como substituida, cancela prazos ativos e nao reaplica o limite regular.
- Desistencia ocorre por fluxo dedicado, cancela prazos ativos e preserva estado terminal de testemunha substituida.
- Validacao executada com build, testes unitarios e suite e2e existente verdes.
