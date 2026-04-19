import { createWitnessSchema, updateWitnessSchema } from '../../schema/zod';

describe('Witness schemas', () => {
  it.each([
    ['cpf', '12345678900'],
    ['rg', '1234567'],
    ['cnh', '12345678901'],
  ])(
    'rejects prohibited document field %s on create payload',
    (field, value) => {
      const result = createWitnessSchema.safeParse({
        processId: '11111111-1111-4111-8111-111111111111',
        fullName: 'Maria da Silva',
        address: 'Rua A, 10',
        residenceComarca: 'Sao Paulo',
        [field]: value,
      });

      expect(result.success).toBe(false);
    },
  );

  it('rejects prohibited document field on update payload', () => {
    const result = updateWitnessSchema.safeParse({
      rg: '1234567',
    });

    expect(result.success).toBe(false);
  });
});
