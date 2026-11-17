import { z } from 'zod';

const trimmed = () => z.string().trim();

export const emailSchema = trimmed().toLowerCase().email().max(254);

export const passwordSchema = z
  .string()
  .min(8)
  .max(72)
  .refine((v) => /\p{L}/u.test(v) && /\d/.test(v), 'Пароль має містити щонайменше одну літеру й одну цифру');

export const fullNameSchema = trimmed()
  .min(2)
  .max(100)
  .regex(/^[\p{L}\s'’ʼ-]+$/u, 'Лише літери, пробіл, апостроф і дефіс');

export function normalizePhone(value: string): string {
  const compact = value.replace(/[\s()-]/g, '');
  return /^0\d{9}$/.test(compact) ? `+38${compact}` : compact;
}

export const phoneSchema = z
  .string()
  .transform(normalizePhone)
  .refine((v) => /^\+380\d{9}$/.test(v), 'Телефон у форматі +380XXXXXXXXX');

export const addressSchema = trimmed().min(5).max(200);

export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => (v ? v : null));

export const moneySchema = z
  .union([z.number(), z.string().trim()])
  .transform((v) => (typeof v === 'string' ? Number(v.replace(',', '.')) : v))
  .refine((v) => Number.isFinite(v), 'Некоректна ціна')
  .refine((v) => v >= 0.01 && v <= 9_999_999.99, 'Ціна від 0,01 до 9 999 999,99 грн')
  .refine((v) => Math.abs(Math.round(v * 100) - v * 100) < 1e-6, 'Не більше двох знаків після коми');

export const idSchema = z.coerce.number().int().positive();

export const pageSchema = z.coerce.number().int().min(1).catch(1).default(1);
