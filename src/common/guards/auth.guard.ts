import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { IncomingHttpHeaders } from 'node:http';
import { userProfileValues } from '../../schema';
import { getSessionFromHeaders } from '../../modules/auth/auth';
import { PUBLIC_ROUTE_KEY } from '../decorators/public.decorator';
import type { UserProfile } from '../decorators/roles.decorator';

export type AuthenticatedUser = {
  id: string;
  name: string;
  email: string;
  profile: UserProfile;
  active: boolean;
};

export type AuthenticatedRequest = {
  headers: IncomingHttpHeaders;
  user?: AuthenticatedUser;
};

function isUserProfile(value: string | null | undefined): value is UserProfile {
  return (
    typeof value === 'string' &&
    userProfileValues.includes(value as UserProfile)
  );
}

function toHeaders(headersMap: IncomingHttpHeaders) {
  const headers = new Headers();

  for (const [key, value] of Object.entries(headersMap)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        headers.append(key, item);
      }
      continue;
    }

    if (value !== undefined) {
      headers.append(key, String(value));
    }
  }

  return headers;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      PUBLIC_ROUTE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const session = await getSessionFromHeaders(toHeaders(request.headers));

    if (!session?.user) {
      throw new UnauthorizedException('Authentication required');
    }

    const { user } = session;
    const profile = user.profile;

    if (!isUserProfile(profile)) {
      throw new UnauthorizedException('Invalid user profile');
    }

    if (user.active === false) {
      throw new ForbiddenException('Inactive user');
    }

    request.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      profile,
      active: user.active ?? true,
    };

    return true;
  }
}
