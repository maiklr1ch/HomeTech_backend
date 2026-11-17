import { z } from 'zod';
import { moneySchema } from '../common/schemas';

const SEARCH_CHARS = /^[\p{Script=Latin}А-ЩЬЮЯҐЄІЇа-щьюяґєії0-9\s'’ʼ.,:;\-–/+()&%№"«»]+$/u;

export const searchQuerySchema = z
  .string()
  .trim()
  .min(2, 'Запит має містити від 2 до 100 символів')
  .max(100, 'Запит має містити від 2 до 100 символів')
  .regex(SEARCH_CHARS, 'Запит може містити лише українські чи латинські літери, цифри та розділові знаки');

export const cartItemSchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().int().min(1).max(99),
  price: moneySchema.optional(),
});

export const cartItemsSchema = z
  .array(cartItemSchema)
  .max(50)
  .refine((items) => new Set(items.map((i) => i.productId)).size === items.length, 'Товари в кошику повторюються');

export const cartValidateSchema = z.object({ items: cartItemsSchema });

export type CartItemInput = z.infer<typeof cartItemSchema>;
export type CartValidateDto = z.infer<typeof cartValidateSchema>;
