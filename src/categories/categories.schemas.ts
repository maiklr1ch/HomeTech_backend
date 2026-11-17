import { z } from 'zod';

const slugSchema = z.string().trim().min(2).max(60).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Лише латинські малі літери, цифри й дефіси');
const patternSchema = z
  .string()
  .trim()
  .max(200)
  .nullable()
  .transform((v) => (v ? v : null))
  .refine((v) => {
    if (v === null) return true;
    try {
      new RegExp(v, 'i');
      return true;
    } catch {
      return false;
    }
  }, 'Некоректний регулярний вираз');

const categoryFields = {
  name: z.string().trim().min(2).max(60),
  slug: slugSchema,
  parentId: z.number().int().positive().nullable(),
  sortOrder: z.number().int().min(-100000).max(100000),
  isVisible: z.boolean(),
  importPattern: patternSchema,
};

export const createCategorySchema = z
  .object({
    name: categoryFields.name,
    slug: categoryFields.slug.optional(),
    parentId: categoryFields.parentId.optional(),
    sortOrder: categoryFields.sortOrder.optional(),
    isVisible: categoryFields.isVisible.optional(),
    importPattern: categoryFields.importPattern.optional(),
  })
  .strict();

export const updateCategorySchema = z
  .object({
    name: categoryFields.name.optional(),
    slug: categoryFields.slug.optional(),
    parentId: categoryFields.parentId.optional(),
    sortOrder: categoryFields.sortOrder.optional(),
    isVisible: categoryFields.isVisible.optional(),
    importPattern: categoryFields.importPattern.optional(),
  })
  .strict();

const optionSchema = z
  .string()
  .trim()
  .min(1)
  .max(50)
  .refine((v) => !v.includes(','), 'Варіант не може містити кому');

const attributeFields = {
  name: z.string().trim().min(1).max(60),
  type: z.enum(['number', 'enum', 'bool', 'text']),
  unit: z
    .string()
    .trim()
    .max(15)
    .nullable()
    .transform((v) => (v ? v : null)),
  options: z
    .array(optionSchema)
    .max(30)
    .refine((o) => new Set(o).size === o.length, 'Варіанти повторюються'),
  isFilterable: z.boolean(),
  sortOrder: z.number().int().min(-100000).max(100000),
};

export const createAttributeSchema = z
  .object({
    name: attributeFields.name,
    type: attributeFields.type,
    unit: attributeFields.unit.optional(),
    options: attributeFields.options.optional(),
    isFilterable: attributeFields.isFilterable.optional(),
    sortOrder: attributeFields.sortOrder.optional(),
  })
  .strict();

export const updateAttributeSchema = z
  .object({
    name: attributeFields.name.optional(),
    type: attributeFields.type.optional(),
    unit: attributeFields.unit.optional(),
    options: attributeFields.options.optional(),
    isFilterable: attributeFields.isFilterable.optional(),
    sortOrder: attributeFields.sortOrder.optional(),
  })
  .strict();

export type CreateCategoryDto = z.infer<typeof createCategorySchema>;
export type UpdateCategoryDto = z.infer<typeof updateCategorySchema>;
export type CreateAttributeDto = z.infer<typeof createAttributeSchema>;
export type UpdateAttributeDto = z.infer<typeof updateAttributeSchema>;
