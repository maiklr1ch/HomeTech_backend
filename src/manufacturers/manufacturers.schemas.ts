import { z } from 'zod';
import { optionalText } from '../common/schemas';

const nameSchema = z.string().trim().min(1).max(100);

export const createManufacturerSchema = z
  .object({
    name: nameSchema,
    country: optionalText(60).optional(),
  })
  .strict();

export const updateManufacturerSchema = z
  .object({
    name: nameSchema.optional(),
    country: optionalText(60).optional(),
  })
  .strict();

export type CreateManufacturerDto = z.infer<typeof createManufacturerSchema>;
export type UpdateManufacturerDto = z.infer<typeof updateManufacturerSchema>;
