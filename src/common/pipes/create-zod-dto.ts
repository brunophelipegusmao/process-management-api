import { z, type ZodTypeAny } from 'zod';

type ZodDtoClass<TSchema extends ZodTypeAny> = {
  new (): z.infer<TSchema>;
  schema: TSchema;
};

export function createZodDto<TSchema extends ZodTypeAny>(
  schema: TSchema,
): ZodDtoClass<TSchema> {
  class AugmentedZodDto {
    static schema = schema;
  }

  return AugmentedZodDto as ZodDtoClass<TSchema>;
}
