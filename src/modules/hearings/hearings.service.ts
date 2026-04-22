import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import type {
  CreateHearingInput,
  HearingFiltersInput,
  UpdateHearingInput,
} from '../../schema/zod';
import { EmailService } from '../../infra/email/email.service';
import { InternalNotificationService } from '../../infra/email/internal-notification.service';
import { DeadlineCalculatorService } from '../deadlines/deadline-calculator.service';
import { DeadlinesRepository } from '../deadlines/deadlines.repository';
import { auditContext } from '../../common/interceptors/audit-context';
import { WitnessesRepository } from '../witnesses/witnesses.repository';
import {
  HearingsRepository,
  type HearingEntity,
  type HearingProcessContext,
} from './hearings.repository';

type HearingMutationResult = HearingEntity & {
  witnessWorkflowActivated?: boolean;
  cancelledDeadlineCount?: number;
  recreatedDeadlineCount?: number;
  pendingNotifications?: Array<'E4' | 'E5'>;
  internalNotifications?: string[];
};

type RescheduleInput = {
  dateTime: Date;
};

const witnessFlowHearingTypes = new Set<HearingEntity['type']>([
  'aij',
  'oitiva',
  'acij',
]);

const hearingBasedDeadlineTypes = new Set([
  'juntada_intimacao',
  'desistencia_testemunha',
]);

const intimatedWitnessStatuses = ['intimada', 'intimacao_positiva'] as const;

@Injectable()
export class HearingsService {
  constructor(
    private readonly hearingsRepository: HearingsRepository,
    private readonly deadlinesRepository: DeadlinesRepository,
    private readonly witnessesRepository: WitnessesRepository,
    private readonly deadlineCalculatorService: DeadlineCalculatorService,
    private readonly emailService: EmailService,
    private readonly internalNotificationService: InternalNotificationService,
  ) {}

  async findMany(filters: HearingFiltersInput) {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 10;
    const result = await this.hearingsRepository.findMany({
      ...filters,
      page,
      pageSize,
    });

    return {
      items: result.items,
      meta: {
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
      },
    };
  }

  async findById(id: string) {
    const hearing = await this.hearingsRepository.findById(id);

    if (!hearing) {
      throw new NotFoundException({
        error: 'Hearing not found',
      });
    }

    return hearing;
  }

  async create(input: CreateHearingInput): Promise<HearingMutationResult> {
    const process = await this.getProcessContext(input.processId);

    const hearing = await this.hearingsRepository.create({
      processId: input.processId,
      dateTime: input.dateTime,
      type: input.type,
      status: input.status,
      rescheduledTo: input.rescheduledTo ?? undefined,
    });

    return this.attachWitnessFlowState(hearing, process);
  }

  async update(
    id: string,
    input: UpdateHearingInput,
  ): Promise<HearingMutationResult> {
    const currentHearing = await this.findById(id);
    auditContext.setPreviousData(currentHearing);

    if (input.status === 'cancelada' || input.status === 'redesignada') {
      throw new BadRequestException({
        error: 'Use dedicated hearing lifecycle endpoints for this status',
      });
    }

    const process = await this.getProcessContext(
      input.processId ?? currentHearing.processId,
    );
    const hearing = await this.hearingsRepository.update(id, input);

    if (!hearing) {
      throw new NotFoundException({
        error: 'Hearing not found',
      });
    }

    return this.attachWitnessFlowState(hearing, process);
  }

  async cancel(id: string): Promise<HearingMutationResult> {
    const currentHearing = await this.findById(id);
    auditContext.setPreviousData(currentHearing);
    const process = await this.getProcessContext(currentHearing.processId);

    const result = await this.hearingsRepository.runInTransaction(
      async (tx) => {
        const hearing = await this.hearingsRepository.update(
          id,
          {
            status: 'cancelada',
            rescheduledTo: undefined,
          },
          tx,
        );

        if (!hearing) {
          throw new NotFoundException({
            error: 'Hearing not found',
          });
        }

        const cancelledDeadlineCount =
          await this.deadlinesRepository.cancelActiveByProcessId(
            currentHearing.processId,
            tx,
          );

        return {
          ...hearing,
          cancelledDeadlineCount,
          pendingNotifications: ['E4'] as Array<'E4'>,
        };
      },
    );

    await this.emailService.sendTemplate({
      processId: currentHearing.processId,
      template: 'E4',
      recipient: process.clientEmail,
      variables: {
        processCode: process.cnjNumber,
        hearingDate: currentHearing.dateTime.toISOString(),
      },
    });

    return result;
  }

  async reschedule(
    id: string,
    input: RescheduleInput,
  ): Promise<HearingMutationResult> {
    const currentHearing = await this.findById(id);
    auditContext.setPreviousData(currentHearing);
    const process = await this.getProcessContext(currentHearing.processId);
    const activeDeadlines =
      await this.deadlinesRepository.findActiveByProcessId(
        currentHearing.processId,
      );
    const hearingBoundDeadlines = activeDeadlines.filter((deadline) =>
      hearingBasedDeadlineTypes.has(deadline.type),
    );

    const deltaInDays = Math.ceil(
      Math.abs(input.dateTime.getTime() - currentHearing.dateTime.getTime()) /
        (1000 * 60 * 60 * 24),
    );
    const intimatedWitnessCount =
      deltaInDays > 30
        ? await this.witnessesRepository.countByProcessAndStatuses(
            currentHearing.processId,
            [...intimatedWitnessStatuses],
          )
        : 0;

    const result = await this.hearingsRepository.runInTransaction(
      async (tx) => {
        const hearing = await this.hearingsRepository.update(
          id,
          {
            status: 'redesignada',
            rescheduledTo: input.dateTime,
          },
          tx,
        );

        if (!hearing) {
          throw new NotFoundException({
            error: 'Hearing not found',
          });
        }

        const cancelledDeadlineCount =
          await this.deadlinesRepository.cancelActiveByProcessId(
            currentHearing.processId,
            tx,
          );

        let recreatedDeadlineCount = 0;

        for (const deadline of hearingBoundDeadlines) {
          const dueDate = await this.deadlineCalculatorService.calculate({
            type: deadline.type,
            hearingDate: input.dateTime,
            municipality: undefined,
            referenceDate: undefined,
            state: undefined,
          });

          await this.deadlinesRepository.create(
            {
              processId: deadline.processId,
              witnessId: deadline.witnessId ?? undefined,
              type: deadline.type,
              dueDate,
              status: 'aberto',
              notificationSent: false,
            },
            tx,
          );

          recreatedDeadlineCount += 1;
        }

        return {
          ...hearing,
          cancelledDeadlineCount,
          recreatedDeadlineCount,
          pendingNotifications: ['E5'] as Array<'E5'>,
          internalNotifications:
            deltaInDays > 30 && intimatedWitnessCount > 0
              ? ['WITNESSES_ALREADY_INTIMATED_RESCHEDULED_OVER_30_DAYS']
              : undefined,
        };
      },
    );

    await this.emailService.sendTemplate({
      processId: currentHearing.processId,
      template: 'E5',
      recipient: process.clientEmail,
      variables: {
        processCode: process.cnjNumber,
        previousDate: currentHearing.dateTime.toISOString(),
        newDate: input.dateTime.toISOString(),
      },
    });

    if (result.internalNotifications?.length) {
      await this.internalNotificationService.notifyRecipients({
        processId: currentHearing.processId,
        processCode: process.cnjNumber,
        message:
          'Audiencia redesignada acima de 30 dias com testemunhas ja intimadas',
      });
    }

    return result;
  }

  private async getProcessContext(processId: string) {
    const process = await this.hearingsRepository.findProcessContext(processId);

    if (!process) {
      throw new NotFoundException({
        error: 'Process not found',
      });
    }

    return process;
  }

  private attachWitnessFlowState(
    hearing: HearingEntity,
    process: HearingProcessContext,
  ): HearingMutationResult {
    return {
      ...hearing,
      witnessWorkflowActivated:
        process.mentionsWitness && witnessFlowHearingTypes.has(hearing.type),
    };
  }
}
