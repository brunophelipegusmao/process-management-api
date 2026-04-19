import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';

import type {
  CreateWitnessInput,
  ReplaceWitnessInput,
  UpdateWitnessInput,
  WitnessFiltersInput,
} from '../../schema/zod';
import { EmailService } from '../../infra/email/email.service';
import { DeadlinesRepository } from '../deadlines/deadlines.repository';
import { DeadlinesService } from '../deadlines/deadlines.service';
import {
  WitnessesRepository,
  type CreateWitnessRecordInput,
  type WitnessEntity,
  type WitnessProcessContext,
} from './witnesses.repository';

type WitnessMutationResult = WitnessEntity & {
  cancelledDeadlineCount?: number;
  replacedWitnessId?: string;
  pendingNotifications?: Array<'E1' | 'E3'>;
};

const terminalStatuses = new Set(['substituida']);
const forbiddenCreateStatuses = new Set(['substituida', 'desistida']);

@Injectable()
export class WitnessesService {
  constructor(
    private readonly witnessesRepository: WitnessesRepository,
    private readonly deadlinesService: DeadlinesService,
    private readonly deadlinesRepository: DeadlinesRepository,
    private readonly emailService: EmailService,
  ) {}

  async findMany(filters: WitnessFiltersInput) {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 10;
    const result = await this.witnessesRepository.findMany({
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
    const witness = await this.witnessesRepository.findById(id);

    if (!witness) {
      throw new NotFoundException({
        error: 'Witness not found',
      });
    }

    return witness;
  }

  async create(input: CreateWitnessInput): Promise<WitnessMutationResult> {
    this.assertAllowedCreatePayload(
      input.status,
      input.replaced,
      input.replacedById,
    );

    const process = await this.getProcessContext(input.processId);
    await this.assertLimitAvailable(process);

    const record = this.toCreateRecord(input, process);
    const witness = await this.witnessesRepository.create(record);

    return this.attachIncompleteSideEffects(witness, process);
  }

  async update(
    id: string,
    input: UpdateWitnessInput,
  ): Promise<WitnessMutationResult> {
    const currentWitness = await this.findById(id);

    this.assertMutableWitness(currentWitness);

    if (input.processId && input.processId !== currentWitness.processId) {
      throw new BadRequestException({
        error: 'Witness process cannot be changed',
      });
    }

    if (input.status && forbiddenCreateStatuses.has(input.status)) {
      throw new BadRequestException({
        error:
          'Use dedicated replacement or retirement flow for terminal status changes',
      });
    }

    const mergedAddress = input.address?.trim() ?? currentWitness.address;
    const updatedWitness = await this.witnessesRepository.update(id, {
      ...input,
      status: input.status ?? this.resolveStatus(mergedAddress),
      address: input.address !== undefined ? mergedAddress : undefined,
      residenceComarca:
        input.residenceComarca !== undefined
          ? input.residenceComarca.trim() || currentWitness.residenceComarca
          : undefined,
    });

    if (!updatedWitness) {
      throw new NotFoundException({
        error: 'Witness not found',
      });
    }

    return updatedWitness;
  }

  async replace(
    id: string,
    input: ReplaceWitnessInput,
  ): Promise<WitnessMutationResult> {
    this.assertAllowedCreatePayload(input.status, false, undefined);

    const currentWitness = await this.findById(id);

    if (currentWitness.replaced || currentWitness.status === 'substituida') {
      throw new UnprocessableEntityException({
        error: 'Witness already replaced',
      });
    }

    const process = await this.getProcessContext(currentWitness.processId);
    const replacementRecord = this.toCreateRecord(
      {
        ...input,
        processId: currentWitness.processId,
      },
      process,
    );

    const { replacementWitness, cancelledDeadlineCount } =
      await this.witnessesRepository.runInTransaction(async (tx) => {
        const createdReplacement = await this.witnessesRepository.create(
          replacementRecord,
          tx,
        );

        await this.witnessesRepository.markAsReplaced(
          id,
          createdReplacement.id,
          tx,
        );

        const cancelledCount =
          await this.deadlinesRepository.cancelActiveByWitnessId(id, tx);

        return {
          replacementWitness: createdReplacement,
          cancelledDeadlineCount: cancelledCount,
        };
      });

    const replacementWithSideEffects = await this.attachIncompleteSideEffects(
      replacementWitness,
      process,
    );

    return {
      ...replacementWithSideEffects,
      replacedWitnessId: id,
      cancelledDeadlineCount,
    };
  }

  async remove(id: string): Promise<WitnessMutationResult> {
    const currentWitness = await this.findById(id);

    if (currentWitness.replaced || currentWitness.status === 'substituida') {
      throw new UnprocessableEntityException({
        error: 'Substituted witness is in terminal state',
      });
    }

    if (currentWitness.status === 'desistida') {
      return {
        ...currentWitness,
        cancelledDeadlineCount: 0,
      };
    }

    const { retiredWitness, cancelledDeadlineCount } =
      await this.witnessesRepository.runInTransaction(async (tx) => {
        const updatedWitness = await this.witnessesRepository.markAsRetired(
          id,
          tx,
        );

        if (!updatedWitness) {
          throw new NotFoundException({
            error: 'Witness not found',
          });
        }

        const cancelledCount =
          await this.deadlinesRepository.cancelActiveByWitnessId(id, tx);

        return {
          retiredWitness: updatedWitness,
          cancelledDeadlineCount: cancelledCount,
        };
      });

    return {
      ...retiredWitness,
      cancelledDeadlineCount,
    };
  }

  private async getProcessContext(processId: string) {
    const process =
      await this.witnessesRepository.findProcessContext(processId);

    if (!process) {
      throw new NotFoundException({
        error: 'Process not found',
      });
    }

    return process;
  }

  private async assertLimitAvailable(process: WitnessProcessContext) {
    const currentCount = await this.witnessesRepository.countActiveForProcess(
      process.id,
    );
    const limit = process.courtType === 'jec' ? 4 : 10;

    if (currentCount >= limit) {
      throw new ConflictException({
        error: 'Witness limit reached for process',
        details: {
          vagas_restantes: Math.max(limit - currentCount, 0),
        },
      });
    }
  }

  private assertAllowedCreatePayload(
    status: string | undefined,
    replaced: boolean | undefined,
    replacedById: string | undefined,
  ) {
    if (replaced || replacedById) {
      throw new BadRequestException({
        error: 'Replacement control fields are managed internally',
      });
    }

    if (status && forbiddenCreateStatuses.has(status)) {
      throw new BadRequestException({
        error: 'Terminal witness statuses are managed by dedicated flows',
      });
    }
  }

  private assertMutableWitness(witness: WitnessEntity) {
    if (witness.replaced || terminalStatuses.has(witness.status)) {
      throw new UnprocessableEntityException({
        error: 'Substituted witness is in terminal state',
      });
    }
  }

  private toCreateRecord(
    input: {
      processId: string;
      fullName: string;
      address?: string;
      residenceComarca?: string;
      maritalStatus?: string;
      profession?: string;
      phone?: string;
      notes?: string;
      side?: WitnessEntity['side'];
      status?: WitnessEntity['status'];
    },
    process: WitnessProcessContext,
  ): CreateWitnessRecordInput {
    const address = input.address?.trim() ?? '';
    const residenceComarca = input.residenceComarca?.trim() || process.comarca;

    return {
      processId: input.processId,
      fullName: input.fullName.trim(),
      address,
      residenceComarca,
      maritalStatus: input.maritalStatus,
      profession: input.profession,
      phone: input.phone,
      notes: input.notes,
      side: input.side ?? 'reu',
      status: input.status ?? this.resolveStatus(address),
      replaced: false,
      replacedById: undefined,
    };
  }

  private resolveStatus(address: string) {
    return address.trim().length > 0 ? 'dados_completos' : 'pendente_dados';
  }

  private async attachIncompleteSideEffects(
    witness: WitnessEntity,
    process: WitnessProcessContext,
  ): Promise<WitnessMutationResult> {
    if (witness.status !== 'pendente_dados') {
      return witness;
    }

    await this.deadlinesService.create({
      processId: witness.processId,
      witnessId: witness.id,
      type: 'dados_testemunha',
      referenceDate: new Date(),
      municipality: process.comarca,
    });

    await this.emailService.sendTemplate({
      processId: witness.processId,
      template: 'E1',
      recipient: process.clientEmail,
      variables: {
        processCode: process.cnjNumber,
        witnessName: witness.fullName,
        dueDate: new Date().toISOString().slice(0, 10),
      },
    });

    return {
      ...witness,
      pendingNotifications: ['E1'],
    };
  }
}
