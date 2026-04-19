import {
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';

import { DeadlinesService } from './deadlines.service';
import type { DeadlinesRepository } from './deadlines.repository';
import type { DeadlineCalculatorService } from './deadline-calculator.service';
import type { CreateDeadlineInput } from '../../schema/zod';

describe('DeadlinesService', () => {
  let service: DeadlinesService;
  let repository: jest.Mocked<DeadlinesRepository>;
  let calculator: jest.Mocked<DeadlineCalculatorService>;

  beforeEach(() => {
    repository = {
      findMany: jest.fn(),
      findById: jest.fn(),
      findProcessContext: jest.fn(),
      findWitnessContext: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      cancel: jest.fn(),
    } as unknown as jest.Mocked<DeadlinesRepository>;

    calculator = {
      calculate: jest.fn(),
    } as unknown as jest.Mocked<DeadlineCalculatorService>;

    service = new DeadlinesService(repository, calculator);
  });

  it('creates a deadline with calculated due date', async () => {
    const input: CreateDeadlineInput = {
      processId: '11111111-1111-4111-8111-111111111111',
      type: 'dados_testemunha',
      referenceDate: new Date('2026-04-19T00:00:00.000Z'),
      municipality: 'Sao Paulo',
      state: 'SP',
    };

    repository.findProcessContext.mockResolvedValue({
      id: input.processId,
      comarca: 'Sao Paulo',
    });
    calculator.calculate.mockResolvedValue(
      new Date('2026-04-27T00:00:00.000Z'),
    );
    repository.create.mockResolvedValue({
      id: '22222222-2222-4222-8222-222222222222',
      processId: input.processId,
      witnessId: null,
      type: 'dados_testemunha',
      dueDate: '2026-04-27',
      status: 'aberto',
      notificationSent: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.create(input);

    expect(calculator.calculate).toHaveBeenCalledWith({
      type: 'dados_testemunha',
      referenceDate: input.referenceDate,
      hearingDate: undefined,
      municipality: 'Sao Paulo',
      state: 'SP',
    });
    expect(repository.create).toHaveBeenCalledWith({
      processId: input.processId,
      witnessId: undefined,
      type: 'dados_testemunha',
      dueDate: new Date('2026-04-27T00:00:00.000Z'),
      status: 'aberto',
      notificationSent: false,
    });
    expect(result.status).toBe('aberto');
  });

  it('rejects creation when process does not exist', async () => {
    repository.findProcessContext.mockResolvedValue(null);

    await expect(
      service.create({
        processId: '11111111-1111-4111-8111-111111111111',
        type: 'providencia_cliente',
        referenceDate: new Date('2026-04-19T00:00:00.000Z'),
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects creation when witness is replaced', async () => {
    repository.findProcessContext.mockResolvedValue({
      id: '11111111-1111-4111-8111-111111111111',
      comarca: 'Sao Paulo',
    });
    repository.findWitnessContext.mockResolvedValue({
      id: '33333333-3333-4333-8333-333333333333',
      processId: '11111111-1111-4111-8111-111111111111',
      replaced: true,
      status: 'substituida',
    });

    await expect(
      service.create({
        processId: '11111111-1111-4111-8111-111111111111',
        witnessId: '33333333-3333-4333-8333-333333333333',
        type: 'dados_testemunha',
        referenceDate: new Date('2026-04-19T00:00:00.000Z'),
      }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('cancels a deadline instead of deleting it', async () => {
    repository.findById.mockResolvedValue({
      id: '44444444-4444-4444-8444-444444444444',
      processId: '11111111-1111-4111-8111-111111111111',
      witnessId: null,
      type: 'providencia_cliente',
      dueDate: '2026-04-24',
      status: 'aberto',
      notificationSent: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    repository.cancel.mockResolvedValue({
      id: '44444444-4444-4444-8444-444444444444',
      processId: '11111111-1111-4111-8111-111111111111',
      witnessId: null,
      type: 'providencia_cliente',
      dueDate: '2026-04-24',
      status: 'cancelado',
      notificationSent: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.remove('44444444-4444-4444-8444-444444444444');

    expect(repository.cancel).toHaveBeenCalledWith(
      '44444444-4444-4444-8444-444444444444',
    );
    expect(result.status).toBe('cancelado');
  });
});
