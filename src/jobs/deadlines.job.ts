import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { DeadlinesRepository } from '../modules/deadlines/deadlines.repository';
import { JobsRepository } from './jobs.repository';

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
  failedSteps: string[];
};

@Injectable()
export class DeadlinesJob {
  private readonly logger = new Logger(DeadlinesJob.name);

  constructor(
    private readonly deadlinesRepository: DeadlinesRepository,
    private readonly jobsRepository: JobsRepository,
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

    const overdueCount = await this.runStep<number>(
      'markOverdueDeadlines',
      failedSteps,
      async (tx) => {
        const overdueDeadlines =
          await this.deadlinesRepository.findOpenDueOnOrBefore(today, tx);

        if (overdueDeadlines.length === 0) {
          return 0;
        }

        await this.deadlinesRepository.markAsOverdueByIds(
          overdueDeadlines.map((deadline) => deadline.id),
          tx,
        );

        return overdueDeadlines.length;
      },
    );

    const preventiveAlertCount = await this.runStep<number>(
      'notifyDeadlinesDueTomorrow',
      failedSteps,
      async (tx) => {
        const upcomingDeadlines = await this.deadlinesRepository.findOpenDueOn(
          tomorrow,
          tx,
        );

        if (upcomingDeadlines.length === 0) {
          return 0;
        }

        await this.deadlinesRepository.markNotificationSentByIds(
          upcomingDeadlines.map((deadline) => deadline.id),
          tx,
        );

        return upcomingDeadlines.length;
      },
    );

    const hearingAlertCount = await this.runStep<number>(
      'notifyJuntadaIntimacao',
      failedSteps,
      async (tx) => {
        const hearingDeadlines =
          await this.deadlinesRepository.findPendingJuntadaIntimacaoDueOn(
            today,
            tx,
          );

        if (hearingDeadlines.length === 0) {
          return 0;
        }

        await this.deadlinesRepository.markNotificationSentByIds(
          hearingDeadlines.map((deadline) => deadline.id),
          tx,
        );

        return hearingDeadlines.length;
      },
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
            failedSteps,
          },
        },
        tx,
      );

      return 1;
    });

    this.logger.log(
      `job-prazos completed overdueCount=${overdueCount} preventiveAlertCount=${preventiveAlertCount} hearingAlertCount=${hearingAlertCount}`,
    );

    return {
      overdueCount,
      preventiveAlertCount,
      hearingAlertCount,
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
      return 0 as T;
    }
  }
}
