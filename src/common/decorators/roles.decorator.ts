import { SetMetadata } from '@nestjs/common';
import { userProfileValues } from '../../schema';

export type UserProfile = (typeof userProfileValues)[number];

export const ROLES_KEY = 'requiredRoles';

export const Roles = (...roles: UserProfile[]) => SetMetadata(ROLES_KEY, roles);
