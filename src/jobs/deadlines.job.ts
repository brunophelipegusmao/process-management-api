import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InternalNotificationService } from '../infra/email/internal-notification.service';

import {
  DeadlinesRepository,
  type DeadlineEntity,
} from '../modules/deadlines/deadlines.repository';
import { JobsRepository } from './jobs.repository';

const ACK_PENDING_THRESHOLD_DAYS = 7;

function startOfUtcDay(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + amount);
  return next;
}

type DeadlineJobResult = {
  overdueCount: number;
  preventiveAlertCount: number;
  hearingAlertCount: number;
  pendingAckAlertCount: number;
  failedSteps: string[];
};

@Injectable()
export class DeadlinesJob {
  private readonly logger = new Logger(DeadlinesJob.name);

  constructor(
    private readonly deadlinesRepository: DeadlinesRepository,
    private readonly jobsRepository: JobsRepository,
    private readonly internalNotificationService: InternalNotificationService,
  ) {}

  @Cron('0 7 * * *', {
    name: 'job-prazos',
    waitForCompletion: true,
  })
  async handleCron() {
    return this.run();
  }

  async run(referenceDate = new Date()): Promise<DeadlineJobResult> {
    const today = startOfUtcDay(referenceDate);
    const tomorrow = addDays(today, 1);
    const failedSteps: string[] = [];

    const overdueDeadlines = await this.runStep<DeadlineEntity[]>(
      'markOverdueDeadlines',
      failedSteps,
      async (tx) => {
        const overdueDeadlines =
          await this.deadlinesRepository.findOpenDueOnOrBefore(today, tx);

        if (overdueDeadlines.length === 0) {
          return [];
        }

        await this.deadlinesRepository.markAsOverdueByIds(
          overdueDeadlines.map((deadline) => deadline.id),
          tx,
        );

        return overdueDeadlines;
      },
    );
    const overdueCount = overdueDeadlines.length;
    await this.notifyByProcess(
      overdueDeadlines,
      (count) => `${count} prazo(s) vencido(s) exigem atuacao imediata`,
    );

    const preventiveAlertDeadlines = await this.runStep<DeadlineEntity[]>(
      'notifyDeadlinesDueTomorrow',
      failedSteps,
      async (tx) => {
        const upcomingDeadlines = await this.deadlinesRepository.findOpenDueOn(
          tomorrow,
          tx,
        );

        if (upcomingDeadlines.length === 0) {
          return [];
        }

        await this.deadlinesRepository.markNotificationSentByIds(
          upcomingDeadlines.map((deadline) => deadline.id),
          tx,
        );

        return upcomingDeadlines;
      },
    );
    const preventiveAlertCount = preventiveAlertDeadlines.length;
    await this.notifyByProcess(
      preventiveAlertDeadlines,
      (count) => `${count} prazo(s) vencem amanha e precisam de acompanhamento`,
    );

    const hearingAlertDeadlines = await this.runStep<DeadlineEntity[]>(
      'notifyJuntadaIntimacao',
      failedSteps,
      async (tx) => {
        const hearingDeadlines =
          await this.deadlinesRepository.findPendingJuntadaIntimacaoDueOn(
            today,
            tx,
          );

        if (hearingDeadlines.length === 0) {
          return [];
        }

        await this.deadlinesRepository.markNotificationSentByIds(
          hearingDeadlines.map((deadline) => deadline.id),
          tx,
        );

        return hearingDeadlines;
      },
    );
    const hearingAlertCount = hearingAlertDeadlines.length;
    await this.notifyByProcess(
      hearingAlertDeadlines,
      (count) =>
        `${count} prazo(s) de juntada de intimacao atingiram a data de acao`,
    );

    const ackThreshold = addDays(today, -ACK_PENDING_THRESHOLD_DAYS);
    const pendingAckEmails = await this.runStep<{ processId: string }[]>(
      'notifyPendingAcknowledgments',
      failedSteps,
      async () => {
        return this.jobsRepository.findPendingAcknowledgments(ackThreshold);
      },
    );
    const pendingAckAlertCount = pendingAckEmails.length;
    await this.notifyByProcess(
      pendingAckEmails,
      (count) =>
        `${count} e-mail(s) sem confirmacao de recebimento ha mais de ${ACK_PENDING_THRESHOLD_DAYS} dias`,
    );

    await this.runStep<number>('appendAuditLog', failedSteps, async (tx) => {
      await this.jobsRepository.createAuditLog(
        {
          actionType: 'JOB_PRAZOS',
          description: 'JOB-PRAZOS execution',
          newData: {
            date: today.toISOString().slice(0, 10),
            overdueCount,
            preventiveAlertCount,
            hearingAlertCount,
            pendingAckAlertCount,
            failedSteps,
          },
        },
        tx,
      );

      return 1;
    });

    this.logger.log(
      `job-prazos completed overdueCount=${overdueCount} preventiveAlertCount=${preventiveAlertCount} hearingAlertCount=${hearingAlertCount} pendingAckAlertCount=${pendingAckAlertCount}`,
    );

    return {
      overdueCount,
      preventiveAlertCount,
      hearingAlertCount,
      pendingAckAlertCount,
      failedSteps,
    };
  }

  private async runStep<T>(
    stepName: string,
    failedSteps: string[],
    callback: (
      tx: Parameters<Parameters<JobsRepository['runInTransaction']>[0]>[0],
    ) => Promise<T>,
  ) {
    try {
      return (await this.jobsRepository.runInTransaction(callback)) as T;
    } catch (error) {
      failedSteps.push(stepName);
      const message = error instanceof Error ? error.message : 'unknown error';
      this.logger.error(`job-prazos step=${stepName} failed: ${message}`);
      return [] as T;
    }
  }

  private async notifyByProcess(
    items: Array<{ processId: string }>,
    buildMessage: (count: number) => string,
  ) {
    const countsByProcess = items.reduce<Record<string, number>>(
      (accumulator, item) => {
        accumulator[item.processId] = (accumulator[item.processId] ?? 0) + 1;
        return accumulator;
      },
      {},
    );

    await Promise.all(
      Object.entries(countsByProcess).map(([processId, count]) =>
        this.internalNotificationService.notifyRecipients({
          processId,
          message: buildMessage(count),
        }),
      ),
    );
  }
}
