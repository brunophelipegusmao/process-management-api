import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

type HttpReply = {
  status(code: number): {
    send(body: unknown): void;
  };
};

type ErrorResponseBody = {
  error: string;
  details?: unknown;
};

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<HttpReply>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      response.status(status).send(this.normalizeHttpException(exception));
      return;
    }

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
      error: 'Internal server error',
    } satisfies ErrorResponseBody);
  }

  private normalizeHttpException(exception: HttpException): ErrorResponseBody {
    const payload = exception.getResponse();

    if (typeof payload === 'string') {
      return { error: payload };
    }

    if (!payload || typeof payload !== 'object') {
      return { error: exception.message };
    }

    const responsePayload = payload as {
      error?: unknown;
      details?: unknown;
      message?: unknown;
    };

    if (typeof responsePayload.error === 'string') {
      return {
        error: responsePayload.error,
        ...(responsePayload.details !== undefined
          ? { details: responsePayload.details }
          : responsePayload.message !== undefined
            ? { details: responsePayload.message }
            : {}),
      };
    }

    if (typeof responsePayload.message === 'string') {
      return { error: responsePayload.message };
    }

    if (Array.isArray(responsePayload.message)) {
      return {
        error: 'Request failed',
        details: responsePayload.message,
      };
    }

    return { error: exception.message };
  }
}
