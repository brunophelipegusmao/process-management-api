import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';
import { ZodError, type ZodTypeAny } from 'zod';

type ZodSchemaCarrier = {
  schema?: ZodTypeAny;
};

type ValidationErrorDetail = {
  field: string;
  message: string;
};

export function formatZodError(error: ZodError): ValidationErrorDetail[] {
  return error.issues.map((issue) => ({
    field: issue.path.length > 0 ? issue.path.join('.') : 'root',
    message: issue.message,
  }));
}

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  transform(value: unknown, metadata: ArgumentMetadata): unknown {
    const metatype = metadata.metatype as ZodSchemaCarrier | undefined;
    const schema = metatype?.schema;

    if (!schema) {
      return value;
    }

    const parsed = schema.safeParse(value);

    if (parsed.success) {
      return parsed.data;
    }

    throw new BadRequestException({
      error: 'Validation failed',
      details: formatZodError(parsed.error),
    });
  }
}
