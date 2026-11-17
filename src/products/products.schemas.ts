import { z } from 'zod';
import { moneySchema, optionalText } from '../common/schemas';

export const attributeValueSchema = z.object({
  attributeId: z.number().int().positive(),
  value: z.union([z.number(), z.string(), z.boolean(), z.null()]),
});

const productFields = {
  name: z.string().trim().min(3).max(200),
  stockStatus: z.enum(['in_stock', 'expected', 'out_of_stock']),
  categoryId: z.number().int().positive().nullable(),
  manufacturerId: z.number().int().positive().nullable(),
  manufacturerName: z.string().trim().min(1).max(100),
  sku: optionalText(100),
  price: moneySchema.nullable(),
  warrantyMonths: z.number().int().min(0).max(120).nullable(),
  description: optionalText(5000),
  assemblyCountry: optionalText(60),
  assemblyCity: optionalText(60),
  attributes: z.array(attributeValueSchema).max(100),
  isVisible: z.boolean(),
};

export const createProductSchema = z
  .object({
    ...productFields,
    categoryId: productFields.categoryId.optional(),
    manufacturerId: productFields.manufacturerId.optional(),
    manufacturerName: productFields.manufacturerName.optional(),
    sku: productFields.sku.optional(),
    price: productFields.price.optional(),
    warrantyMonths: productFields.warrantyMonths.optional(),
    description: productFields.description.optional(),
    assemblyCountry: productFields.assemblyCountry.optional(),
    assemblyCity: productFields.assemblyCity.optional(),
    attributes: productFields.attributes.optional(),
    isVisible: productFields.isVisible.optional(),
  })
  .strict();

export const updateProductSchema = z
  .object(Object.fromEntries(Object.entries(productFields).map(([k, v]) => [k, v.optional()])) as {
    [K in keyof typeof productFields]: z.ZodOptional<(typeof productFields)[K]>;
  })
  .strict();

export type CreateProductDto = z.infer<typeof createProductSchema>;
export type UpdateProductDto = z.infer<typeof updateProductSchema>;
export type AttributeValueInput = z.infer<typeof attributeValueSchema>;
