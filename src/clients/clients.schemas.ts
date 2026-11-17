import { z } from 'zod';
import { addressSchema, emailSchema, fullNameSchema, phoneSchema } from '../common/schemas';

const optionalAddress = z
  .union([addressSchema, z.literal(''), z.null()])
  .optional()
  .transform((v) => (v === '' ? null : v));

export const createClientSchema = z
  .object({
    email: emailSchema,
    fullName: fullNameSchema,
    phone: phoneSchema,
    defaultAddress: optionalAddress,
  })
  .strict();

export const updateClientSchema = z
  .object({
    email: emailSchema.optional(),
    fullName: fullNameSchema.optional(),
    phone: phoneSchema.optional(),
    defaultAddress: optionalAddress,
  })
  .strict();

export const clientStatusSchema = z.enum(['active', 'blocked', 'all']).catch('all');

export type CreateClientDto = z.infer<typeof createClientSchema>;
export type UpdateClientDto = z.infer<typeof updateClientSchema>;
