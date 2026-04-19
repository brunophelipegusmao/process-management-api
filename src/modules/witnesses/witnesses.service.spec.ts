import {
  ConflictException,
  UnprocessableEntityException,
} from '@nestjs/common';

import type { CreateDeadlineInput } from '../../schema/zod';
import type { DeadlinesRepository } from '../deadlines/deadlines.repository';
import type { DeadlinesService } from '../deadlines/deadlines.service';
import type { WitnessesRepository } from './witnesses.repository';
import { WitnessesService } from './witnesses.service';

describe('WitnessesService', () => {
  let service: WitnessesService;
  let witnessesRepository: jest.Mocked<WitnessesRepository>;
  let deadlinesService: jest.Mocked<DeadlinesService>;
  let deadlinesRepository: jest.Mocked<DeadlinesRepository>;

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
      runInTransaction: jest.fn(),
    } as unknown as jest.Mocked<WitnessesRepository>;

    deadlinesService = {
      create: jest.fn(),
    } as unknown as jest.Mocked<DeadlinesService>;

    deadlinesRepository = {
      cancelActiveByWitnessId: jest.fn(),
    } as unknown as jest.Mocked<DeadlinesRepository>;

    service = new WitnessesService(
      witnessesRepository,
      deadlinesService,
      deadlinesRepository,
    );
  });

  it('blocks witness creation when JEC limit is reached', async () => {
    witnessesRepository.findProcessContext.mockResolvedValue({
      id: '11111111-1111-4111-8111-111111111111',
      courtType: 'jec',
      comarca: 'Sao Paulo',
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
});
