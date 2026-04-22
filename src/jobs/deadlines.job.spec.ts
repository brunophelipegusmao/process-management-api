import { DeadlinesJob } from './deadlines.job';
import type { InternalNotificationService } from '../infra/email/internal-notification.service';
import type { DeadlinesRepository } from '../modules/deadlines/deadlines.repository';
import type { JobsRepository } from './jobs.repository';

describe('DeadlinesJob', () => {
  let job: DeadlinesJob;
  let deadlinesRepository: jest.Mocked<DeadlinesRepository>;
  let jobsRepository: jest.Mocked<JobsRepository>;
  let internalNotificationService: jest.Mocked<InternalNotificationService>;

  beforeEach(() => {
    deadlinesRepository = {
      findOpenDueOnOrBefore: jest.fn(),
      markAsOverdueByIds: jest.fn(),
      findOpenDueOn: jest.fn(),
      findPendingJuntadaIntimacaoDueOn: jest.fn(),
      markNotificationSentByIds: jest.fn(),
    } as unknown as jest.Mocked<DeadlinesRepository>;

    jobsRepository = {
      runInTransaction: jest.fn(),
      createAuditLog: jest.fn(),
    } as unknown as jest.Mocked<JobsRepository>;

    internalNotificationService = {
      notifyRecipients: jest.fn(),
    } as unknown as jest.Mocked<InternalNotificationService>;

    jobsRepository.runInTransaction.mockImplementation(async (callback) =>
      callback(Symbol('tx') as never),
    );

    job = new DeadlinesJob(
      deadlinesRepository,
      jobsRepository,
      internalNotificationService,
    );
  });

  it('processes deadlines in isolated steps and writes append-only audit log', async () => {
    deadlinesRepository.findOpenDueOnOrBefore.mockResolvedValue([
      {
        id: 'd1',
        processId: 'p1',
        witnessId: null,
        type: 'providencia_cliente',
        dueDate: '2026-04-19',
        status: 'aberto',
        notificationSent: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ] as never);
    deadlinesRepository.findOpenDueOn.mockResolvedValue([
      {
        id: 'd2',
        processId: 'p1',
        witnessId: null,
        type: 'providencia_cliente',
        dueDate: '2026-04-20',
        status: 'aberto',
        notificationSent: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ] as never);
    deadlinesRepository.findPendingJuntadaIntimacaoDueOn.mockResolvedValue([
      {
        id: 'd3',
        processId: 'p1',
        witnessId: 'w1',
        type: 'juntada_intimacao',
        dueDate: '2026-04-19',
        status: 'vencido',
        notificationSent: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ] as never);

    const result = await job.run(new Date('2026-04-19T00:00:00.000Z'));

    expect(deadlinesRepository.markAsOverdueByIds).toHaveBeenCalledWith(
      ['d1'],
      expect.anything(),
    );
    expect(
      deadlinesRepository.markNotificationSentByIds,
    ).toHaveBeenNthCalledWith(1, ['d2'], expect.anything());
    expect(
      deadlinesRepository.markNotificationSentByIds,
    ).toHaveBeenNthCalledWith(2, ['d3'], expect.anything());
    expect(jobsRepository.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: 'JOB_PRAZOS',
      }),
      expect.anything(),
    );
    expect(result.overdueCount).toBe(1);
    expect(result.preventiveAlertCount).toBe(1);
    expect(result.hearingAlertCount).toBe(1);
    expect(
      internalNotificationService.notifyRecipients,
    ).toHaveBeenNthCalledWith(1, {
      processId: 'p1',
      message: '1 prazo(s) vencido(s) exigem atuacao imediata',
    });
    expect(
      internalNotificationService.notifyRecipients,
    ).toHaveBeenNthCalledWith(2, {
      processId: 'p1',
      message: '1 prazo(s) vencem amanha e precisam de acompanhamento',
    });
    expect(
      internalNotificationService.notifyRecipients,
    ).toHaveBeenNthCalledWith(3, {
      processId: 'p1',
      message: '1 prazo(s) de juntada de intimacao atingiram a data de acao',
    });
  });

  it('keeps running next steps when one step fails', async () => {
    deadlinesRepository.findOpenDueOnOrBefore.mockRejectedValueOnce(
      new Error('step 1 failed'),
    );
    deadlinesRepository.findOpenDueOn.mockResolvedValue([] as never);
    deadlinesRepository.findPendingJuntadaIntimacaoDueOn.mockResolvedValue(
      [] as never,
    );

    const result = await job.run(new Date('2026-04-19T00:00:00.000Z'));

    expect(deadlinesRepository.findOpenDueOn).toHaveBeenCalled();
    expect(
      deadlinesRepository.findPendingJuntadaIntimacaoDueOn,
    ).toHaveBeenCalled();
    expect(jobsRepository.createAuditLog).toHaveBeenCalled();
    expect(result.failedSteps).toEqual(['markOverdueDeadlines']);
  });
});
