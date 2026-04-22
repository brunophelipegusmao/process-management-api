import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, from } from 'rxjs';
import { mergeMap } from 'rxjs/operators';

import { auditLogs, type actionTypeValues } from '../../schema';
import { db } from '../../infra/database/client';
import { auditContext } from './audit-context';

type ActionType = (typeof actionTypeValues)[number];

type AuthenticatedRequest = {
  method: string;
  url: string;
  user?: {
    id?: string;
  };
  body?: Record<string, unknown>;
  params?: Record<string, string>;
  query?: Record<string, unknown>;
};

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const actionType = this.resolveActionType(request);

    if (!actionType) {
      return next.handle();
    }

    return new Observable((observer) => {
      auditContext.run(() => {
        next
          .handle()
          .pipe(
            mergeMap((data) =>
              from(this.persistAuditLog(request, actionType, data)),
            ),
          )
          .subscribe(observer);
      });
    });
  }

  private async persistAuditLog(
    request: AuthenticatedRequest,
    actionType: ActionType,
    data: unknown,
  ): Promise<unknown> {
    await db.insert(auditLogs).values({
      userId: request.user?.id,
      processId: this.resolveProcessId(request, data),
      actionType,
      description: `${request.method} ${request.url}`,
      previousData: auditContext.getPreviousData() ?? null,
      newData: this.toRecord(data),
    });

    return data;
  }

  private resolveProcessId(
    request: AuthenticatedRequest,
    data: unknown,
  ): string | undefined {
    const bodyProcessId = this.extractString(request.body?.processId);
    const paramProcessId = this.extractString(request.params?.processId);
    const queryProcessId = this.extractString(request.query?.processId);
    const resultProcessId =
      data !== null && typeof data === 'object' && 'processId' in data
        ? this.extractString((data as Record<string, unknown>).processId)
        : undefined;

    return bodyProcessId ?? paramProcessId ?? queryProcessId ?? resultProcessId;
  }

  private resolveActionType(
    request: AuthenticatedRequest,
  ): ActionType | undefined {
    const method = request.method.toUpperCase();
    const path = request.url.toLowerCase();

    if (
      method === 'POST' &&
      path.includes('/hearings') &&
      path.includes('/reschedule')
    ) {
      return 'RESCHEDULE_HEARING';
    }

    if (
      method === 'POST' &&
      path.includes('/witnesses') &&
      path.includes('/intimation')
    ) {
      return 'UPDATE_WITNESS';
    }

    if (
      method === 'POST' &&
      path.includes('/witnesses') &&
      path.includes('/replace')
    ) {
      return 'REPLACE_WITNESS';
    }

    if (method === 'POST' && path.includes('/processes'))
      return 'CREATE_PROCESS';
    if (method === 'PATCH' && path.includes('/processes'))
      return 'UPDATE_PROCESS';
    if (method === 'DELETE' && path.includes('/processes'))
      return 'DELETE_PROCESS';
    if (method === 'POST' && path.includes('/hearings'))
      return 'CREATE_HEARING';
    if (method === 'PATCH' && path.includes('/hearings'))
      return 'UPDATE_HEARING';
    if (method === 'DELETE' && path.includes('/hearings'))
      return 'CANCEL_HEARING';
    if (method === 'POST' && path.includes('/witnesses'))
      return 'CREATE_WITNESS';
    if (method === 'PATCH' && path.includes('/witnesses'))
      return 'UPDATE_WITNESS';
    if (method === 'DELETE' && path.includes('/witnesses'))
      return 'RETIRE_WITNESS';
    if (method === 'POST' && path.includes('/deadlines'))
      return 'CREATE_DEADLINE';
    if (method === 'PATCH' && path.includes('/deadlines'))
      return 'UPDATE_DEADLINE';
    if (method === 'DELETE' && path.includes('/deadlines'))
      return 'CANCEL_DEADLINE';
    if (method === 'POST' && path.includes('/users')) return 'CREATE_USER';
    if (method === 'PATCH' && path.includes('/users')) return 'UPDATE_USER';

    return undefined;
  }

  private toRecord(data: unknown): Record<string, unknown> | null {
    return data !== null && typeof data === 'object'
      ? (data as Record<string, unknown>)
      : null;
  }

  private extractString(value: unknown): string | undefined {
    return typeof value === 'string' && value.length > 0 ? value : undefined;
  }
}
