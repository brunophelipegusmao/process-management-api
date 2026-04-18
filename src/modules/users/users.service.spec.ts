import {
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import type { UsersRepository } from './users.repository';
import type { CreateUserInput, UpdateUserInput } from '../../schema/zod';

describe('UsersService', () => {
  let service: UsersService;
  let repository: jest.Mocked<UsersRepository>;

  beforeEach(() => {
    repository = {
      findMany: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    } as unknown as jest.Mocked<UsersRepository>;

    service = new UsersService(repository);
  });

  it('creates a user with normalized email when it is unique', async () => {
    const input: CreateUserInput = {
      name: 'Advogado',
      email: 'ADV@EXEMPLO.COM',
      profile: 'advogado',
      active: true,
    };

    repository.findByEmail.mockResolvedValue(null);
    repository.create.mockResolvedValue({
      id: '5c78fd23-5767-4965-aa86-33f1664b4001',
      name: 'Advogado',
      email: 'adv@exemplo.com',
      emailVerified: false,
      image: null,
      profile: 'advogado',
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.create(input);

    expect(repository.findByEmail).toHaveBeenCalledWith('adv@exemplo.com');
    expect(repository.create).toHaveBeenCalledWith({
      ...input,
      email: 'adv@exemplo.com',
    });
    expect(result.email).toBe('adv@exemplo.com');
  });

  it('rejects user creation when email already exists', async () => {
    repository.findByEmail.mockResolvedValue({
      id: '5c78fd23-5767-4965-aa86-33f1664b4001',
      name: 'Advogado',
      email: 'adv@exemplo.com',
      emailVerified: false,
      image: null,
      profile: 'advogado',
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(
      service.create({
        name: 'Outro',
        email: 'adv@exemplo.com',
        profile: 'paralegal',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('blocks deletion of the single superadmin account', async () => {
    repository.findById.mockResolvedValue({
      id: '5c78fd23-5767-4965-aa86-33f1664b4001',
      name: 'Super',
      email: 'super@exemplo.com',
      emailVerified: true,
      image: null,
      profile: 'superadmin',
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(
      service.remove('5c78fd23-5767-4965-aa86-33f1664b4001'),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('rejects update when target user does not exist', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(
      service.update('5c78fd23-5767-4965-aa86-33f1664b4001', {
        active: false,
      } satisfies UpdateUserInput),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
