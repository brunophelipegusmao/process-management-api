import { NotFoundException } from '@nestjs/common';

import type { EmailService } from '../../infra/email/email.service';
import type { InternalNotificationService } from '../../infra/email/internal-notification.service';
import type { DeadlineCalculatorService } from '../deadlines/deadline-calculator.service';
import type { DeadlinesRepository } from '../deadlines/deadlines.repository';
import type { WitnessesRepository } from '../witnesses/witnesses.repository';
import type { HearingsRepository } from './hearings.repository';
import { HearingsService } from './hearings.service';

describe('HearingsService', () => {
  let service: HearingsService;
  let hearingsRepository: jest.Mocked<HearingsRepository>;
  let deadlinesRepository: jest.Mocked<DeadlinesRepository>;
  let witnessesRepository: jest.Mocked<WitnessesRepository>;
  let deadlineCalculatorService: jest.Mocked<DeadlineCalculatorService>;
  let emailService: jest.Mocked<EmailService>;
  let internalNotificationService: jest.Mocked<InternalNotificationService>;

  beforeEach(() => {
    hearingsRepository = {
      findMany: jest.fn(),
      findById: jest.fn(),
      findProcessContext: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      runInTransaction: jest.fn(),
    } as unknown as jest.Mocked<HearingsRepository>;

    deadlinesRepository = {
      findActiveByProcessId: jest.fn(),
      cancelActiveByProcessId: jest.fn(),
      create: jest.fn(),
    } as unknown as jest.Mocked<DeadlinesRepository>;

    witnessesRepository = {
      countByProcessAndStatuses: jest.fn(),
    } as unknown as jest.Mocked<WitnessesRepository>;

    deadlineCalculatorService = {
      calculate: jest.fn(),
    } as unknown as jest.Mocked<DeadlineCalculatorService>;

    emailService = {
      sendTemplate: jest.fn(),
    } as unknown as jest.Mocked<EmailService>;

    internalNotificationService = {
      notifyRecipients: jest.fn(),
    } as unknown as jest.Mocked<InternalNotificationService>;

    service = new HearingsService(
      hearingsRepository,
      deadlinesRepository,
      witnessesRepository,
      deadlineCalculatorService,
      emailService,
      internalNotificationService,
    );
  });

  it('creates hearing and does not activate witness flow for conciliacao', async () => {
    hearingsRepository.findProcessContext.mockResolvedValue({
      id: '11111111-1111-4111-8111-111111111111',
      mentionsWitness: true,
      cnjNumber: '0001111-11.2026.8.26.0001',
      clientEmail: 'cliente@teste.com',
    });
    hearingsRepository.create.mockResolvedValue({
      id: '22222222-2222-4222-8222-222222222222',
      processId: '11111111-1111-4111-8111-111111111111',
      dateTime: new Date('2026-05-10T14:00:00.000Z'),
      type: 'conciliacao',
      status: 'agendada',
      rescheduledTo: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.create({
      processId: '11111111-1111-4111-8111-111111111111',
      dateTime: new Date('2026-05-10T14:00:00.000Z'),
      type: 'conciliacao',
      status: 'agendada',
    });

    expect(result.witnessWorkflowActivated).toBe(false);
  });

  it('creates hearing and activates witness flow for AIJ when process mentions witnesses', async () => {
    hearingsRepository.findProcessContext.mockResolvedValue({
      id: '11111111-1111-4111-8111-111111111111',
      mentionsWitness: true,
      cnjNumber: '0001111-11.2026.8.26.0001',
      clientEmail: 'cliente@teste.com',
    });
    hearingsRepository.create.mockResolvedValue({
      id: '22222222-2222-4222-8222-222222222222',
      processId: '11111111-1111-4111-8111-111111111111',
      dateTime: new Date('2026-05-10T14:00:00.000Z'),
      type: 'aij',
      status: 'agendada',
      rescheduledTo: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.create({
      processId: '11111111-1111-4111-8111-111111111111',
      dateTime: new Date('2026-05-10T14:00:00.000Z'),
      type: 'aij',
      status: 'agendada',
    });

    expect(result.witnessWorkflowActivated).toBe(true);
  });

  it('cancels hearing, cancels process deadlines and emits E4', async () => {
    const tx = Symbol('tx');

    hearingsRepository.findById.mockResolvedValue({
      id: '33333333-3333-4333-8333-333333333333',
      processId: '11111111-1111-4111-8111-111111111111',
      dateTime: new Date('2026-05-10T14:00:00.000Z'),
      type: 'aij',
      status: 'agendada',
      rescheduledTo: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    hearingsRepository.findProcessContext.mockResolvedValue({
      id: '11111111-1111-4111-8111-111111111111',
      mentionsWitness: true,
      cnjNumber: '0004444-44.2026.8.26.0004',
      clientEmail: 'cliente@teste.com',
    });
    hearingsRepository.runInTransaction.mockImplementation(async (callback) =>
      callback(tx as never),
    );
    hearingsRepository.update.mockResolvedValue({
      id: '33333333-3333-4333-8333-333333333333',
      processId: '11111111-1111-4111-8111-111111111111',
      dateTime: new Date('2026-05-10T14:00:00.000Z'),
      type: 'aij',
      status: 'cancelada',
      rescheduledTo: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    deadlinesRepository.cancelActiveByProcessId.mockResolvedValue(3);

    const result = await service.cancel('33333333-3333-4333-8333-333333333333');

    expect(deadlinesRepository.cancelActiveByProcessId).toHaveBeenCalledWith(
      '11111111-1111-4111-8111-111111111111',
      tx,
    );
    expect(emailService.sendTemplate).toHaveBeenCalledWith({
      processId: '11111111-1111-4111-8111-111111111111',
      template: 'E4',
      recipient: 'cliente@teste.com',
      variables: {
        processCode: '0004444-44.2026.8.26.0004',
        hearingDate: '2026-05-10T14:00:00.000Z',
      },
    });
    expect(result.cancelledDeadlineCount).toBe(3);
    expect(result.pendingNotifications).toEqual(['E4']);
  });

  it('reschedules hearing, cancels current deadlines, recreates hearing-based deadlines and emits E5', async () => {
    const tx = Symbol('tx');
    const hearingId = '33333333-3333-4333-8333-333333333333';
    const processId = '11111111-1111-4111-8111-111111111111';
    const newDate = new Date('2026-07-20T14:00:00.000Z');

    hearingsRepository.findById.mockResolvedValue({
      id: hearingId,
      processId,
      dateTime: new Date('2026-05-10T14:00:00.000Z'),
      type: 'aij',
      status: 'agendada',
      rescheduledTo: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    hearingsRepository.findProcessContext.mockResolvedValue({
      id: processId,
      mentionsWitness: true,
      cnjNumber: '0005555-55.2026.8.26.0005',
      clientEmail: 'cliente@teste.com',
    });
    hearingsRepository.runInTransaction.mockImplementation(async (callback) =>
      callback(tx as never),
    );
    hearingsRepository.update.mockResolvedValue({
      id: hearingId,
      processId,
      dateTime: new Date('2026-05-10T14:00:00.000Z'),
      type: 'aij',
      status: 'redesignada',
      rescheduledTo: newDate,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    deadlinesRepository.findActiveByProcessId.mockResolvedValue([
      {
        id: '44444444-4444-4444-8444-444444444444',
        processId,
        witnessId: '55555555-5555-4555-8555-555555555555',
        type: 'juntada_intimacao',
        dueDate: '2026-05-03',
        status: 'aberto',
        notificationSent: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '66666666-6666-4666-8666-666666666666',
        processId,
        witnessId: '55555555-5555-4555-8555-555555555555',
        type: 'providencia_cliente',
        dueDate: '2026-05-05',
        status: 'aberto',
        notificationSent: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    deadlinesRepository.cancelActiveByProcessId.mockResolvedValue(2);
    witnessesRepository.countByProcessAndStatuses.mockResolvedValue(1);
    deadlineCalculatorService.calculate.mockResolvedValue(
      new Date('2026-07-13T00:00:00.000Z'),
    );
    deadlinesRepository.create.mockResolvedValue({
      id: '77777777-7777-4777-8777-777777777777',
      processId,
      witnessId: '55555555-5555-4555-8555-555555555555',
      type: 'juntada_intimacao',
      dueDate: '2026-07-13',
      status: 'aberto',
      notificationSent: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.reschedule(hearingId, {
      dateTime: newDate,
    });

    expect(deadlinesRepository.cancelActiveByProcessId).toHaveBeenCalledWith(
      processId,
      tx,
    );
    expect(deadlineCalculatorService.calculate).toHaveBeenCalledWith({
      type: 'juntada_intimacao',
      hearingDate: newDate,
      municipality: undefined,
      referenceDate: undefined,
      state: undefined,
    });
    expect(deadlinesRepository.create).toHaveBeenCalledTimes(1);
    expect(emailService.sendTemplate).toHaveBeenCalledWith({
      processId,
      template: 'E5',
      recipient: 'cliente@teste.com',
      variables: {
        processCode: '0005555-55.2026.8.26.0005',
        previousDate: '2026-05-10T14:00:00.000Z',
        newDate: '2026-07-20T14:00:00.000Z',
      },
    });
    expect(result.pendingNotifications).toEqual(['E5']);
    expect(result.internalNotifications).toEqual([
      'WITNESSES_ALREADY_INTIMATED_RESCHEDULED_OVER_30_DAYS',
    ]);
    expect(internalNotificationService.notifyRecipients).toHaveBeenCalledWith({
      processId,
      processCode: '0005555-55.2026.8.26.0005',
      message:
        'Audiencia redesignada acima de 30 dias com testemunhas ja intimadas',
    });
  });

  it('rejects cancel when hearing does not exist', async () => {
    hearingsRepository.findById.mockResolvedValue(null);

    await expect(service.cancel('missing-id')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
