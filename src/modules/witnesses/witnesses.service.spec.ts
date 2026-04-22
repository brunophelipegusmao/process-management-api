import {
  ConflictException,
  UnprocessableEntityException,
} from '@nestjs/common';

import type { CreateDeadlineInput } from '../../schema/zod';
import type { EmailService } from '../../infra/email/email.service';
import type { DeadlinesRepository } from '../deadlines/deadlines.repository';
import type { DeadlinesService } from '../deadlines/deadlines.service';
import type { WitnessesRepository } from './witnesses.repository';
import { WitnessesService } from './witnesses.service';

describe('WitnessesService', () => {
  let service: WitnessesService;
  let witnessesRepository: jest.Mocked<WitnessesRepository>;
  let deadlinesService: jest.Mocked<DeadlinesService>;
  let deadlinesRepository: jest.Mocked<DeadlinesRepository>;
  let emailService: jest.Mocked<EmailService>;

  beforeEach(() => {
    witnessesRepository = {
      findMany: jest.fn(),
      findById: jest.fn(),
      findProcessContext: jest.fn(),
      countActiveForProcess: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      markAsReplaced: jest.fn(),
      markAsRetired: jest.fn(),
      countByProcessAndStatuses: jest.fn(),
      runInTransaction: jest.fn(),
    } as unknown as jest.Mocked<WitnessesRepository>;

    deadlinesService = {
      create: jest.fn(),
    } as unknown as jest.Mocked<DeadlinesService>;

    deadlinesRepository = {
      findMany: jest.fn(),
      cancelActiveByWitnessId: jest.fn(),
    } as unknown as jest.Mocked<DeadlinesRepository>;

    emailService = {
      sendTemplate: jest.fn(),
    } as unknown as jest.Mocked<EmailService>;

    service = new WitnessesService(
      witnessesRepository,
      deadlinesService,
      deadlinesRepository,
      emailService,
    );
  });

  it('blocks witness creation when JEC limit is reached', async () => {
    witnessesRepository.findProcessContext.mockResolvedValue({
      id: '11111111-1111-4111-8111-111111111111',
      courtType: 'jec',
      comarca: 'Sao Paulo',
      mentionsWitness: true,
      cnjNumber: '0001111-11.2026.8.26.0001',
      clientEmail: 'cliente@teste.com',
    });
    witnessesRepository.countActiveForProcess.mockResolvedValue(4);

    await expect(
      service.create({
        processId: '11111111-1111-4111-8111-111111111111',
        fullName: 'Maria da Silva',
        address: 'Rua A, 10',
        residenceComarca: 'Sao Paulo',
      }),
    ).rejects.toMatchObject({
      response: {
        error: 'Witness limit reached for process',
        details: {
          vagas_restantes: 0,
        },
      },
    });
  });

  it('creates DADOS_TESTEMUNHA deadline when witness data is incomplete', async () => {
    const processId = '11111111-1111-4111-8111-111111111111';
    const witnessId = '22222222-2222-4222-8222-222222222222';

    witnessesRepository.findProcessContext.mockResolvedValue({
      id: processId,
      courtType: 'vara',
      comarca: 'Campinas',
      mentionsWitness: true,
      cnjNumber: '0002222-22.2026.8.26.0002',
      clientEmail: 'cliente@teste.com',
    });
    witnessesRepository.countActiveForProcess.mockResolvedValue(0);
    witnessesRepository.create.mockResolvedValue({
      id: witnessId,
      processId,
      replacedById: null,
      fullName: 'Joao Pereira',
      address: '',
      residenceComarca: 'Campinas',
      maritalStatus: null,
      profession: null,
      phone: null,
      notes: null,
      side: 'reu',
      status: 'pendente_dados',
      replaced: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.create({
      processId,
      fullName: 'Joao Pereira',
      address: '',
      residenceComarca: '',
    });

    expect(witnessesRepository.create).toHaveBeenCalledWith({
      processId,
      fullName: 'Joao Pereira',
      address: '',
      residenceComarca: 'Campinas',
      maritalStatus: undefined,
      profession: undefined,
      phone: undefined,
      notes: undefined,
      side: 'reu',
      status: 'pendente_dados',
      replaced: false,
      replacedById: undefined,
    });
    expect(deadlinesService.create).toHaveBeenCalledWith(
      expect.objectContaining<CreateDeadlineInput>({
        processId,
        witnessId,
        type: 'dados_testemunha',
        municipality: 'Campinas',
      }),
    );
    expect(emailService.sendTemplate).toHaveBeenCalledWith({
      processId,
      template: 'E1',
      recipient: 'cliente@teste.com',
      variables: {
        processCode: '0002222-22.2026.8.26.0002',
        witnessName: 'Joao Pereira',
        dueDate: expect.any(String),
      },
    });
    expect(result.pendingNotifications).toEqual(['E1']);
  });

  it('replaces a witness in transaction without applying the regular limit check', async () => {
    const processId = '11111111-1111-4111-8111-111111111111';
    const originalId = '33333333-3333-4333-8333-333333333333';
    const replacementId = '44444444-4444-4444-8444-444444444444';
    const tx = Symbol('tx');

    witnessesRepository.findById.mockResolvedValue({
      id: originalId,
      processId,
      replacedById: null,
      fullName: 'Testemunha Original',
      address: 'Rua A',
      residenceComarca: 'Santos',
      maritalStatus: null,
      profession: null,
      phone: null,
      notes: null,
      side: 'reu',
      status: 'dados_completos',
      replaced: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    witnessesRepository.findProcessContext.mockResolvedValue({
      id: processId,
      courtType: 'vara',
      comarca: 'Santos',
      mentionsWitness: true,
      cnjNumber: '0003333-33.2026.8.26.0003',
      clientEmail: 'cliente@teste.com',
    });
    witnessesRepository.runInTransaction.mockImplementation(async (callback) =>
      callback(tx as never),
    );
    witnessesRepository.create.mockResolvedValue({
      id: replacementId,
      processId,
      replacedById: null,
      fullName: 'Nova Testemunha',
      address: 'Rua B',
      residenceComarca: 'Santos',
      maritalStatus: null,
      profession: null,
      phone: null,
      notes: null,
      side: 'reu',
      status: 'dados_completos',
      replaced: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    witnessesRepository.markAsReplaced.mockResolvedValue({
      id: originalId,
      processId,
      replacedById: replacementId,
      fullName: 'Testemunha Original',
      address: 'Rua A',
      residenceComarca: 'Santos',
      maritalStatus: null,
      profession: null,
      phone: null,
      notes: null,
      side: 'reu',
      status: 'substituida',
      replaced: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    deadlinesRepository.cancelActiveByWitnessId.mockResolvedValue(2);

    const result = await service.replace(originalId, {
      fullName: 'Nova Testemunha',
      address: 'Rua B',
      residenceComarca: 'Santos',
    });

    expect(witnessesRepository.countActiveForProcess).not.toHaveBeenCalled();
    expect(witnessesRepository.markAsReplaced).toHaveBeenCalledWith(
      originalId,
      replacementId,
      tx,
    );
    expect(deadlinesRepository.cancelActiveByWitnessId).toHaveBeenCalledWith(
      originalId,
      tx,
    );
    expect(result.cancelledDeadlineCount).toBe(2);
    expect(result.replacedWitnessId).toBe(originalId);
  });

  it('retires a witness and cancels active deadlines', async () => {
    const witnessId = '55555555-5555-4555-8555-555555555555';
    const tx = Symbol('tx');

    witnessesRepository.findById.mockResolvedValue({
      id: witnessId,
      processId: '11111111-1111-4111-8111-111111111111',
      replacedById: null,
      fullName: 'Carlos Souza',
      address: 'Rua C',
      residenceComarca: 'Sao Paulo',
      maritalStatus: null,
      profession: null,
      phone: null,
      notes: null,
      side: 'reu',
      status: 'intimada',
      replaced: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    witnessesRepository.runInTransaction.mockImplementation(async (callback) =>
      callback(tx as never),
    );
    witnessesRepository.markAsRetired.mockResolvedValue({
      id: witnessId,
      processId: '11111111-1111-4111-8111-111111111111',
      replacedById: null,
      fullName: 'Carlos Souza',
      address: 'Rua C',
      residenceComarca: 'Sao Paulo',
      maritalStatus: null,
      profession: null,
      phone: null,
      notes: null,
      side: 'reu',
      status: 'desistida',
      replaced: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    deadlinesRepository.cancelActiveByWitnessId.mockResolvedValue(1);

    const result = await service.remove(witnessId);

    expect(deadlinesRepository.cancelActiveByWitnessId).toHaveBeenCalledWith(
      witnessId,
      tx,
    );
    expect(result.status).toBe('desistida');
    expect(result.cancelledDeadlineCount).toBe(1);
  });

  it('blocks updates for witness already in terminal substituted state', async () => {
    witnessesRepository.findById.mockResolvedValue({
      id: '66666666-6666-4666-8666-666666666666',
      processId: '11111111-1111-4111-8111-111111111111',
      replacedById: '77777777-7777-4777-8777-777777777777',
      fullName: 'Antiga Testemunha',
      address: 'Rua D',
      residenceComarca: 'Sao Paulo',
      maritalStatus: null,
      profession: null,
      phone: null,
      notes: null,
      side: 'reu',
      status: 'substituida',
      replaced: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(
      service.update('66666666-6666-4666-8666-666666666666', {
        notes: 'nao deveria atualizar',
      }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('creates PROVIDENCIA_CLIENTE and sends E3 on first negative witness outcome', async () => {
    const processId = '11111111-1111-4111-8111-111111111111';
    const witnessId = '88888888-8888-4888-8888-888888888888';

    witnessesRepository.findById.mockResolvedValue({
      id: witnessId,
      processId,
      replacedById: null,
      fullName: 'Luciana Prado',
      address: 'Rua E',
      residenceComarca: 'Campinas',
      maritalStatus: null,
      profession: null,
      phone: null,
      notes: null,
      side: 'reu',
      status: 'intimada',
      replaced: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    witnessesRepository.update.mockResolvedValue({
      id: witnessId,
      processId,
      replacedById: null,
      fullName: 'Luciana Prado',
      address: 'Rua E',
      residenceComarca: 'Campinas',
      maritalStatus: null,
      profession: null,
      phone: null,
      notes: null,
      side: 'reu',
      status: 'intimacao_negativa',
      replaced: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    deadlinesRepository.findMany.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 1,
    });
    witnessesRepository.findProcessContext.mockResolvedValue({
      id: processId,
      courtType: 'vara',
      comarca: 'Campinas',
      mentionsWitness: true,
      cnjNumber: '0008888-88.2026.8.26.0008',
      clientEmail: 'cliente@teste.com',
    });

    const result = await service.update(witnessId, {
      status: 'intimacao_negativa',
    });

    expect(deadlinesRepository.findMany).toHaveBeenCalledWith({
      witnessId,
      type: 'providencia_cliente',
      status: 'aberto',
      page: 1,
      pageSize: 1,
    });
    expect(deadlinesService.create).toHaveBeenCalledWith({
      processId,
      witnessId,
      type: 'providencia_cliente',
      referenceDate: expect.any(Date),
      municipality: 'Campinas',
    });
    expect(emailService.sendTemplate).toHaveBeenCalledWith({
      processId,
      template: 'E3',
      recipient: 'cliente@teste.com',
      variables: {
        processCode: '0008888-88.2026.8.26.0008',
        nextAction:
          'avaliar providencias do cliente sobre a testemunha Luciana Prado',
      },
    });
    expect(result.pendingNotifications).toEqual(['E3']);
  });

  it('registers carta_precatoria intimation and creates CUSTAS_PRECATORIA once', async () => {
    const processId = '10111111-1111-4111-8111-111111111111';
    const witnessId = '20222222-2222-4222-8222-222222222222';

    witnessesRepository.findById.mockResolvedValue({
      id: witnessId,
      processId,
      replacedById: null,
      fullName: 'Paula Almeida',
      address: 'Rua G',
      residenceComarca: 'Campinas',
      maritalStatus: null,
      profession: null,
      phone: null,
      notes: null,
      side: 'reu',
      status: 'dados_completos',
      replaced: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    witnessesRepository.findProcessContext.mockResolvedValue({
      id: processId,
      courtType: 'vara',
      comarca: 'Campinas',
      mentionsWitness: true,
      cnjNumber: '0009999-99.2026.8.26.0009',
      clientEmail: 'cliente@teste.com',
    });
    witnessesRepository.update.mockResolvedValue({
      id: witnessId,
      processId,
      replacedById: null,
      fullName: 'Paula Almeida',
      address: 'Rua G',
      residenceComarca: 'Campinas',
      maritalStatus: null,
      profession: null,
      phone: null,
      notes:
        'Intimacao via carta_precatoria registrada em 2026-04-20T12:00:00.000Z',
      side: 'reu',
      status: 'intimada',
      replaced: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    deadlinesRepository.findMany.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 1,
    });

    const result = await service.requestIntimation(witnessId, {
      method: 'carta_precatoria',
      sentAt: new Date('2026-04-20T12:00:00.000Z'),
    });

    expect(witnessesRepository.update).toHaveBeenCalledWith(
      witnessId,
      expect.objectContaining({
        status: 'intimada',
        notes: expect.stringContaining('carta_precatoria'),
      }),
    );
    expect(deadlinesService.create).toHaveBeenCalledWith({
      processId,
      witnessId,
      type: 'custas_precatoria',
      referenceDate: new Date('2026-04-20T12:00:00.000Z'),
      hearingDate: undefined,
      municipality: 'Campinas',
    });
    expect(result.intimationMethod).toBe('carta_precatoria');
  });

  it('registers positive intimation outcome and creates JUNTADA_INTIMACAO', async () => {
    const processId = '30111111-1111-4111-8111-111111111111';
    const witnessId = '30222222-2222-4222-8222-222222222222';
    const hearingDate = new Date('2026-06-30T14:00:00.000Z');

    witnessesRepository.findById.mockResolvedValue({
      id: witnessId,
      processId,
      replacedById: null,
      fullName: 'Rita Gomes',
      address: 'Rua H',
      residenceComarca: 'Campinas',
      maritalStatus: null,
      profession: null,
      phone: null,
      notes: null,
      side: 'reu',
      status: 'intimada',
      replaced: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    witnessesRepository.findProcessContext.mockResolvedValue({
      id: processId,
      courtType: 'vara',
      comarca: 'Campinas',
      mentionsWitness: true,
      cnjNumber: '0003030-30.2026.8.26.0030',
      clientEmail: 'cliente@teste.com',
    });
    witnessesRepository.update.mockResolvedValue({
      id: witnessId,
      processId,
      replacedById: null,
      fullName: 'Rita Gomes',
      address: 'Rua H',
      residenceComarca: 'Campinas',
      maritalStatus: null,
      profession: null,
      phone: null,
      notes:
        'Resultado da intimacao positivo registrado em 2026-04-20T13:00:00.000Z',
      side: 'reu',
      status: 'intimacao_positiva',
      replaced: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    deadlinesRepository.findMany.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 1,
    });

    const result = await service.registerIntimationOutcome(witnessId, {
      outcome: 'positive',
      hearingDate,
      occurredAt: new Date('2026-04-20T13:00:00.000Z'),
    });

    expect(deadlinesService.create).toHaveBeenCalledWith({
      processId,
      witnessId,
      type: 'juntada_intimacao',
      referenceDate: undefined,
      hearingDate,
      municipality: 'Campinas',
    });
    expect(result.status).toBe('intimacao_positiva');
  });

  it('does not recreate PROVIDENCIA_CLIENTE when the follow-up deadline is already open', async () => {
    const processId = '11111111-1111-4111-8111-111111111111';
    const witnessId = '99999999-9999-4999-8999-999999999999';

    witnessesRepository.findById.mockResolvedValue({
      id: witnessId,
      processId,
      replacedById: null,
      fullName: 'Marina Costa',
      address: 'Rua F',
      residenceComarca: 'Campinas',
      maritalStatus: null,
      profession: null,
      phone: null,
      notes: null,
      side: 'reu',
      status: 'intimada',
      replaced: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    witnessesRepository.update.mockResolvedValue({
      id: witnessId,
      processId,
      replacedById: null,
      fullName: 'Marina Costa',
      address: 'Rua F',
      residenceComarca: 'Campinas',
      maritalStatus: null,
      profession: null,
      phone: null,
      notes: null,
      side: 'reu',
      status: 'aguardando_cliente',
      replaced: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    deadlinesRepository.findMany.mockResolvedValue({
      items: [
        {
          id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          processId,
          witnessId,
          type: 'providencia_cliente',
          dueDate: '2026-05-10',
          status: 'aberto',
          notificationSent: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      total: 1,
      page: 1,
      pageSize: 1,
    });

    const result = await service.update(witnessId, {
      status: 'aguardando_cliente',
    });

    expect(deadlinesService.create).not.toHaveBeenCalled();
    expect(emailService.sendTemplate).not.toHaveBeenCalledWith(
      expect.objectContaining({ template: 'E3' }),
    );
    expect(result.pendingNotifications).toBeUndefined();
  });
});
