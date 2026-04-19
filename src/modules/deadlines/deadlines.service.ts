import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';

import type {
  CreateDeadlineInput,
  DeadlineFiltersInput,
  UpdateDeadlineInput,
} from '../../schema/zod';
import { DeadlineCalculatorService } from './deadline-calculator.service';
import { DeadlinesRepository } from './deadlines.repository';

@Injectable()
export class DeadlinesService {
  constructor(
    private readonly deadlinesRepository: DeadlinesRepository,
    private readonly deadlineCalculatorService: DeadlineCalculatorService,
  ) {}

  async findMany(filters: DeadlineFiltersInput) {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 10;
    const result = await this.deadlinesRepository.findMany({
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
    const deadline = await this.deadlinesRepository.findById(id);

    if (!deadline) {
      throw new NotFoundException({
        error: 'Deadline not found',
      });
    }

    return deadline;
  }

  async create(input: CreateDeadlineInput) {
    const process = await this.deadlinesRepository.findProcessContext(
      input.processId,
    );

    if (!process) {
      throw new NotFoundException({
        error: 'Process not found',
      });
    }

    if (input.witnessId) {
      await this.ensureWitnessCanReceiveDeadline(
        input.witnessId,
        input.processId,
      );
    }

    const dueDate = await this.deadlineCalculatorService.calculate({
      type: input.type,
      referenceDate: input.referenceDate,
      hearingDate: input.hearingDate,
      state: input.state,
      municipality: input.municipality ?? process.comarca,
    });

    return this.deadlinesRepository.create({
      processId: input.processId,
      witnessId: input.witnessId,
      type: input.type,
      dueDate,
      status: 'aberto',
      notificationSent: input.notificationSent ?? false,
    });
  }

  async update(id: string, input: UpdateDeadlineInput) {
    const currentDeadline = await this.findById(id);
    const processId = input.processId ?? currentDeadline.processId;

    if (input.processId) {
      const process = await this.deadlinesRepository.findProcessContext(
        input.processId,
      );

      if (!process) {
        throw new NotFoundException({
          error: 'Process not found',
        });
      }
    }

    if (input.witnessId) {
      await this.ensureWitnessCanReceiveDeadline(input.witnessId, processId);
    }

    if (input.type && !input.dueDate) {
      throw new BadRequestException({
        error: 'dueDate is required when changing deadline type',
      });
    }

    const deadline = await this.deadlinesRepository.update(id, input);

    if (!deadline) {
      throw new NotFoundException({
        error: 'Deadline not found',
      });
    }

    return deadline;
  }

  async remove(id: string) {
    await this.findById(id);

    const deadline = await this.deadlinesRepository.cancel(id);

    if (!deadline) {
      throw new NotFoundException({
        error: 'Deadline not found',
      });
    }

    return deadline;
  }

  private async ensureWitnessCanReceiveDeadline(
    witnessId: string,
    processId: string,
  ) {
    const witness =
      await this.deadlinesRepository.findWitnessContext(witnessId);

    if (!witness) {
      throw new NotFoundException({
        error: 'Witness not found',
      });
    }

    if (witness.processId !== processId) {
      throw new ConflictException({
        error: 'Witness does not belong to the provided process',
      });
    }

    if (witness.replaced) {
      throw new UnprocessableEntityException({
        error: 'Witness cannot receive new deadlines',
        details: {
          witnessId: witness.id,
          status: witness.status,
        },
      });
    }
  }
}
