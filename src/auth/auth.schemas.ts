import { z } from 'zod';
import { addressSchema, emailSchema, fullNameSchema, passwordSchema, phoneSchema } from '../common/schemas';

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  fullName: fullNameSchema,
  phone: phoneSchema,
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().min(1).max(254),
  password: z.string().min(1).max(200),
});

export const profileSchema = z
  .object({
    fullName: fullNameSchema.optional(),
    phone: phoneSchema.optional(),
    defaultAddress: z
      .union([addressSchema, z.literal(''), z.null()])
      .optional()
      .transform((v) => (v === '' ? null : v)),
  })
  .strict();

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: passwordSchema,
});

export type RegisterDto = z.infer<typeof registerSchema>;
export type LoginDto = z.infer<typeof loginSchema>;
export type ProfileDto = z.infer<typeof profileSchema>;
export type PasswordChangeDto = z.infer<typeof passwordChangeSchema>;
