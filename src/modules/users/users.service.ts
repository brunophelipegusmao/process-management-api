import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';

import type {
  CreateUserInput,
  UpdateUserInput,
  UserFiltersInput,
} from '../../schema/zod';
import { UsersRepository } from './users.repository';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async findMany(filters: UserFiltersInput) {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 10;
    const result = await this.usersRepository.findMany({
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
    const user = await this.usersRepository.findById(id);

    if (!user) {
      throw new NotFoundException({
        error: 'User not found',
      });
    }

    return user;
  }

  async create(input: CreateUserInput) {
    const normalizedInput = {
      ...input,
      email: input.email.toLowerCase(),
    } satisfies CreateUserInput;

    await this.ensureUniqueEmail(normalizedInput.email);
    return this.usersRepository.create(normalizedInput);
  }

  async update(id: string, input: UpdateUserInput) {
    const existingUser = await this.findById(id);
    const normalizedInput = {
      ...input,
      ...(input.email ? { email: input.email.toLowerCase() } : {}),
    } satisfies UpdateUserInput;

    if (normalizedInput.email) {
      await this.ensureUniqueEmail(normalizedInput.email, id);
    }

    if (
      existingUser.profile === 'superadmin' &&
      normalizedInput.active === false
    ) {
      throw new UnprocessableEntityException({
        error: 'Superadmin cannot be deactivated via API',
      });
    }

    const user = await this.usersRepository.update(id, normalizedInput);

    if (!user) {
      throw new NotFoundException({
        error: 'User not found',
      });
    }

    return user;
  }

  async remove(id: string) {
    const user = await this.findById(id);

    if (user.profile === 'superadmin') {
      throw new UnprocessableEntityException({
        error: 'Superadmin cannot be deleted via API',
      });
    }

    const deletedUser = await this.usersRepository.remove(id);

    if (!deletedUser) {
      throw new NotFoundException({
        error: 'User not found',
      });
    }

    return deletedUser;
  }

  private async ensureUniqueEmail(email: string, currentUserId?: string) {
    const existingUser = await this.usersRepository.findByEmail(email);

    if (existingUser && existingUser.id !== currentUserId) {
      throw new ConflictException({
        error: 'User email already exists',
      });
    }
  }
}
